"""
web_search.py
-------------
Web search used to look up facts the operator did not supply — chiefly a
project's contract start date.

TODO: set SERPAPI_API_KEY before this does anything.
      Sign up at https://serpapi.com/ (free tier: 100 searches/month), then add
      SERPAPI_API_KEY to the repo-root .env for local work and to the Vercel
      project's environment variables for the deployment. Until then
      `search_web` returns nothing, the assistant cannot prefill a contract
      date, and the UI asks the operator to enter one by hand. Nothing breaks;
      the feature is simply inert.

SerpAPI is the only provider on purpose. Earlier versions fell back through
Google Programmable Search, Tavily, DuckDuckGo and Wikipedia, which meant that
with no key configured every answer came from Wikipedia — a community-edited
page is not something to hang an audit finding on. One keyed, reliable source
that returns nothing when unconfigured beats a chain that quietly degrades to
the least citable option.

Results still carry an `authority`, because SerpAPI returns Google results and
those include wikis and blogs alongside government records. Callers use it to
say plainly what backs a prefilled date.

Fetching only — interpreting the results belongs to ntp_lookup.py.
"""

import html
import os
import re

import requests

DEFAULT_MAX_RESULTS = 6
REQUEST_TIMEOUT_SECONDS = 12
SERPAPI_ENDPOINT = "https://serpapi.com/search"

_TAG_RE = re.compile(r"<[^>]+>")

# Domains that publish contract records first-hand. A date from one of these can
# be cited; a date from a page anyone can edit cannot.
OFFICIAL_DOMAIN_MARKERS = (
    ".gov.ph", ".gov", "dpwh", "philgeps", "coa.gov", "senate.gov",
    "officialgazette", "neda.gov", "dbm.gov",
)
COMMUNITY_DOMAIN_MARKERS = (
    "wikipedia.org", "wikimedia.org", "fandom.com", "reddit.com",
    "quora.com", "blogspot.", "wordpress.com", "medium.com",
)


def _strip_html(fragment: str) -> str:
    """Collapse an HTML fragment down to readable plain text."""
    if not fragment:
        return ""
    return html.unescape(_TAG_RE.sub("", fragment)).strip()


def classify_authority(url: str) -> str:
    """Rate how citable a source is: official, news, or community."""
    if not url:
        return "unknown"
    lowered = url.lower()
    if any(marker in lowered for marker in COMMUNITY_DOMAIN_MARKERS):
        return "community"
    if any(marker in lowered for marker in OFFICIAL_DOMAIN_MARKERS):
        return "official"
    return "news"


def is_configured() -> bool:
    """True when a SerpAPI key is present, so callers can explain the gap."""
    return bool(os.environ.get("SERPAPI_API_KEY"))


def search_web(query: str, max_results: int = DEFAULT_MAX_RESULTS) -> list[dict]:
    """
    Run a web search through SerpAPI.

    Returns:
        A list of {"title", "snippet", "url", "authority"}, or an empty list if
        no key is configured or the search fails. Never raises — an unavailable
        search degrades the lookup into manual entry, it does not fail the
        request.
    """
    if not query or not query.strip():
        return []

    api_key = os.environ.get("SERPAPI_API_KEY")
    if not api_key:
        print("web_search: SERPAPI_API_KEY is not set, skipping search")
        return []

    allow_community = os.environ.get(
        "ALLOW_COMMUNITY_SOURCES", "true"
    ).strip().lower() not in {"false", "0", "no"}

    try:
        response = requests.get(
            SERPAPI_ENDPOINT,
            params={
                "engine": "google",
                "q": query.strip(),
                # SerpAPI caps this at 10 per search.
                "num": min(max_results, 10),
                "api_key": api_key,
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        items = response.json().get("organic_results", [])
    except Exception as exc:  # noqa: BLE001 — search is best-effort by design
        print(f"web_search: SerpAPI lookup failed for {query!r}: {exc}")
        return []

    results = []
    for item in items[:max_results]:
        url = item.get("link", "")
        authority = classify_authority(url)
        if authority == "community" and not allow_community:
            continue
        results.append({
            "title": _strip_html(item.get("title", "")),
            "snippet": _strip_html(item.get("snippet", "")),
            "url": url,
            "authority": authority,
        })

    print(f"web_search: SerpAPI returned {len(results)} results")
    return results


def format_results_for_prompt(results: list[dict]) -> str:
    """Render search hits as a numbered block suitable for an LLM prompt."""
    if not results:
        return "No search results were found."

    lines = []
    for index, result in enumerate(results, start=1):
        lines.append(
            f"[{index}] {result['title']}\n"
            f"    {result['snippet']}\n"
            f"    source: {result['url']} [{result.get('authority', 'unknown')}]"
        )
    return "\n".join(lines)
