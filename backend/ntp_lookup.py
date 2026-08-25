"""
ntp_lookup.py
-------------
Resolves a project's Notice-to-Proceed date from a free-text query.

Two passes, because the two jobs need different inputs:
  1. `extract_query_fields` reads what the operator actually typed.
  2. `resolve_ntp_date` searches the web for whatever they left out.

Both passes ask Gemini for structured JSON. Note the deliberate use of a
`NOT_FOUND` sentinel instead of null: a response_schema field typed STRING
cannot hold a JSON null, so asking the model to "return null" makes it emit the
literal string "null", which then flows downstream and blows up date parsing.
"""

import json
import os
import re
from datetime import datetime

from web_search import (
    classify_authority,
    format_results_for_prompt,
    is_configured,
    search_web,
)

MODEL_NAME = "gemini-3.5-flash-lite"
NOT_FOUND = "NOT_FOUND"
MAX_SEARCHES = 2
ENOUGH_RESULTS = 6
ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

_EXTRACT_INSTRUCTION = (
    "You extract structured fields from an infrastructure-audit query. "
    "Return the location or project name, and any explicit dates the user gave. "
    f"Format dates as YYYY-MM-DD. If a field is absent or you are unsure, return "
    f"exactly '{NOT_FOUND}' for that field — never the word 'null', never a guess. "
    "Also return a focused web search query that would find this project's official "
    "contract Notice-to-Proceed date."
)

_RESOLVE_INSTRUCTION = (
    "You are reading web search results to date the start of an infrastructure "
    "project. The contract Notice-to-Proceed (NTP) date is the ideal answer, but "
    "these are rarely published, so accept the closest documented milestone: "
    "notice of award, contract signing, groundbreaking, or reported construction "
    "start. "
    "Report which one you actually found in `date_type`, using one of: "
    "notice_to_proceed, notice_of_award, contract_signing, groundbreaking, "
    "construction_start. Never relabel a weaker milestone as a notice_to_proceed — "
    "the distinction is what makes the result auditable. "
    f"Return the date as YYYY-MM-DD. If a date is stated with only a month and "
    f"year, use the first day of that month. If the results state no date for this "
    f"specific project, return exactly '{NOT_FOUND}' — do not guess, do not infer "
    "from a fiscal year, and do not substitute a different project's date. "
    "Prefer an official or government source over a news report, and a news "
    "report over a community-edited page such as a wiki. "
    "Also return the source URL you took the date from and a one-sentence rationale."
)

# Human-readable labels for `date_type`, shown to the operator so they know
# exactly what the prefilled date represents before trusting a verdict.
DATE_TYPE_LABELS = {
    "notice_to_proceed": "Notice-to-Proceed date",
    "notice_of_award": "Notice of Award date",
    "contract_signing": "contract signing date",
    "groundbreaking": "groundbreaking date",
    "construction_start": "reported construction start date",
}


def _model(system_instruction: str, schema: dict):
    """Build a Gemini model pinned to a JSON response schema."""
    import google.generativeai as genai

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    genai.configure(api_key=api_key)

    return genai.GenerativeModel(
        MODEL_NAME,
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": schema,
        },
        system_instruction=system_instruction,
    )


def _clean(value) -> str | None:
    """
    Normalize a model-supplied string.

    Collapses the sentinel and every stringified-null spelling models fall back
    to ("null", "None", "N/A", "") down to a real None.
    """
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.upper() in {NOT_FOUND, "NULL", "NONE", "N/A", "NA", "UNKNOWN"}:
        return None
    return text


def _clean_date(value) -> str | None:
    """Return an ISO date string only if it is genuinely a parseable date."""
    text = _clean(value)
    if not text or not ISO_DATE_RE.match(text):
        return None
    try:
        datetime.strptime(text, "%Y-%m-%d")
    except ValueError:
        return None
    return text


def extract_query_fields(text: str) -> dict:
    """
    Pass 1 — read the operator's own words.

    Returns:
        {"location_name": str|None, "start_date": str|None,
         "end_date": str|None, "search_query": str|None}
    """
    model = _model(_EXTRACT_INSTRUCTION, {
        "type": "OBJECT",
        "properties": {
            "location_name": {"type": "STRING"},
            "start_date": {"type": "STRING"},
            "end_date": {"type": "STRING"},
            "search_query": {"type": "STRING"},
        },
        "required": ["location_name", "start_date", "end_date", "search_query"],
    })

    parsed = json.loads(model.generate_content(text).text)
    return {
        "location_name": _clean(parsed.get("location_name")),
        "start_date": _clean_date(parsed.get("start_date")),
        "end_date": _clean_date(parsed.get("end_date")),
        "search_query": _clean(parsed.get("search_query")),
    }


def _dedupe(results: list[dict]) -> list[dict]:
    """Drop repeat URLs while preserving order."""
    seen = set()
    unique = []
    for result in results:
        key = result.get("url") or result.get("title")
        if key and key not in seen:
            seen.add(key)
            unique.append(result)
    return unique


def resolve_ntp_date(
    search_query: str,
    original_text: str = "",
    project_name: str | None = None,
) -> dict:
    """
    Pass 2 — search the web for the project's start date.

    Searches several phrasings and pools the hits. A single LLM-written query
    tends to be heavy on procurement jargon ("official contract Notice to
    Proceed"), which matches almost nothing in a keyword index, so a plainer
    phrasing of the project name is tried alongside it.

    Returns:
        {"date", "date_type", "date_label", "source_url", "rationale",
         "searched", "results_count"}
    """
    empty = {
        "date": None,
        "date_type": None,
        "date_label": None,
        "source_url": None,
        "source_authority": None,
        "rationale": None,
        "searched": False,
        "results_count": 0,
    }
    # Plain phrasing first: keyword indexes match "<project> construction start
    # date" far better than the procurement jargon an LLM tends to produce
    # ("official contract Notice to Proceed"), which matches almost nothing.
    candidates = []
    for candidate in [
        f"{project_name} project construction start date" if project_name else None,
        search_query,
        project_name,
    ]:
        if candidate and candidate not in candidates:
            candidates.append(candidate)
    if not candidates:
        return empty

    # No search key, no searching. Reporting searched=False rather than "searched
    # and found nothing" keeps the UI honest: the operator is told a date was not
    # supplied, not that the web was checked and came back empty.
    if not is_configured():
        return empty

    # Capped at two searches: enough to recover from one bad phrasing, few
    # enough that providers do not start rate-limiting us.
    results = []
    for candidate in candidates[:MAX_SEARCHES]:
        results.extend(search_web(candidate))
        if len(_dedupe(results)) >= ENOUGH_RESULTS:
            break

    results = _dedupe(results)[:8]
    if not results:
        return {**empty, "searched": True}

    model = _model(_RESOLVE_INSTRUCTION, {
        "type": "OBJECT",
        "properties": {
            "ntp_date": {"type": "STRING"},
            "date_type": {"type": "STRING"},
            "source_url": {"type": "STRING"},
            "rationale": {"type": "STRING"},
        },
        "required": ["ntp_date", "date_type", "source_url", "rationale"],
    })

    prompt = (
        f"Operator's query: {original_text or search_query}\n\n"
        f"Search results:\n{format_results_for_prompt(results)}"
    )

    try:
        parsed = json.loads(model.generate_content(prompt).text)
    except Exception as exc:  # noqa: BLE001 — a failed lookup is not a failed request
        print(f"ntp_lookup: resolution failed: {exc}")
        return {**empty, "searched": True, "results_count": len(results)}

    date_type = (_clean(parsed.get("date_type")) or "").lower() or None
    source_url = _clean(parsed.get("source_url"))
    return {
        "date": _clean_date(parsed.get("ntp_date")),
        "date_type": date_type,
        "date_label": DATE_TYPE_LABELS.get(date_type, "project start date"),
        "source_url": source_url,
        # Lets the UI say plainly when a date came from a page anyone can edit,
        # rather than presenting every prefilled date as equally citable.
        "source_authority": classify_authority(source_url or ""),
        "rationale": _clean(parsed.get("rationale")),
        "searched": True,
        "results_count": len(results),
    }
