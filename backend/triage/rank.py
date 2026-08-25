"""
rank.py
-------
Turns per-project analysis plus contract-table flags into one ranked worklist.

The output an auditor acts on is not a score, it is a reason. "Flagged because
no construction was detected, the cost per metre is four times the list median,
and it shares coordinates with contract 24CC0401" sends someone to a site.
An unexplained 0.87 does not, and cannot be defended in an observation memo.

So this is a transparent weighted rubric rather than a learned model. That is a
deliberate choice, not a placeholder for one: there is no labelled training set
yet, and a rubric can be recomputed by hand by the agency being audited. When
`backend/tests/verified_cases.py` grows to a few hundred outcomes, a trained
ranker becomes defensible — and the reasons must survive that change.

Weights are stated as constants so they can be argued with. They have not been
tuned against outcomes; see VALIDATION when that exists.
"""

# What the satellite reading alone contributes. PRE_EXISTING and
# NO_CHANGE_DETECTED sit highest because they are the two findings COA's own
# fraud audits describe. LOCATION_MISMATCH scores low on purpose: it is a
# records problem to resolve before anyone drives anywhere, not an allegation.
VERDICT_WEIGHTS = {
    "PRE_EXISTING": 40,
    "NO_CHANGE_DETECTED": 38,
    "DELAYED_START": 22,
    "LOCATION_MISMATCH": 12,
    "INSUFFICIENT_DATA": 0,
    "CONSISTENT": 0,
}

FLAG_WEIGHTS = {
    "duplicate_coordinates": 25,
    "cost_outlier": 15,
    "contractor_concentration": 8,
}

# Each additional contract sharing the same point, beyond the first.
DUPLICATE_ESCALATION = 5
DUPLICATE_CAP = 40


HIGH_PRIORITY_SCORE = 55
MEDIUM_PRIORITY_SCORE = 25

VERDICT_REASONS = {
    "PRE_EXISTING": "A structure was already standing at this site before the contract start date.",
    "NO_CHANGE_DETECTED": "No construction activity was visible at this coordinate across the contract period.",
    "DELAYED_START": "Ground was broken well after the contract start date.",
    "LOCATION_MISMATCH": "The recorded coordinate does not match the structure the contract describes.",
    "INSUFFICIENT_DATA": "No usable satellite imagery covers this location and period.",
    "CONSISTENT": "The satellite record matches the contract timeline.",
}


def priority_band(score: int) -> str:
    if score >= HIGH_PRIORITY_SCORE:
        return "high"
    if score >= MEDIUM_PRIORITY_SCORE:
        return "medium"
    return "low"


def score_row(analysis: dict, flags: list[dict], expected_area_m2=None) -> dict:
    """
    Score one project.

    Args:
        analysis: the result dict from `backend.analyze.analyze`
        flags: contract-table flags for this row, from `contract_features`
        expected_area_m2: contracted scope, when it is known

    Returns:
        {"score", "priority", "reasons": [str], "verdict"}
    """
    verdict = analysis.get("verdict", "INSUFFICIENT_DATA")
    contributions: list[tuple[int, str]] = []

    weight = VERDICT_WEIGHTS.get(verdict, 0)
    if weight:
        reason = VERDICT_REASONS.get(verdict, verdict.replace("_", " ").lower())
        detected = (analysis.get("change_point") or {}).get("detected_date")
        days = (analysis.get("change_point") or {}).get("days_difference")
        if detected and days is not None:
            direction = "before" if days < 0 else "after"
            reason += f" Change detected {abs(days)} days {direction} the stated date."
        contributions.append((weight, reason))

    for flag in flags:
        base = FLAG_WEIGHTS.get(flag["id"], 0)
        if flag["id"] == "duplicate_coordinates":
            extra = max(0, int(flag.get("magnitude", 1)) - 1) * DUPLICATE_ESCALATION
            base = min(base + extra, DUPLICATE_CAP)
        if base:
            contributions.append((base, flag["reason"]))

    # Strongest reason first: an auditor skimming the list reads one line per row.
    contributions.sort(key=lambda pair: pair[0], reverse=True)
    score = min(100, sum(weight for weight, _ in contributions))

    return {
        "score": score,
        "priority": priority_band(score),
        "verdict": verdict,
        "reasons": [reason for _, reason in contributions],
    }


def rank(analyses: list[dict], flags: list[list[dict]], expected_areas=None) -> list[dict]:
    """
    Score every project and return them ordered worst-first.

    Ties break on project name so the same input always produces the same list —
    a ranking that reshuffles between runs cannot be cited in a report.
    """
    expected_areas = expected_areas or [None] * len(analyses)
    scored = []

    for index, (analysis, row_flags) in enumerate(zip(analyses, flags)):
        entry = score_row(analysis, row_flags, expected_areas[index])
        entry["index"] = index
        entry["project_name"] = analysis.get("project_name", f"Row {index + 1}")
        scored.append(entry)

    scored.sort(key=lambda row: (-row["score"], row["project_name"]))
    for position, row in enumerate(scored, start=1):
        row["rank"] = position
    return scored
