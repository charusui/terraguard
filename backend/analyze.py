"""
analyze.py
----------
Main entry point for the TerraGuard backend.
Called by the Next.js API route via child_process or run directly.

Usage:
    python analyze.py --lat 14.9021 --lon 120.8456 --date 2023-01-15 --name "Test"

Output: JSON to stdout
"""

import json
import sys
import argparse
from datetime import datetime, timedelta

from sar_fetch import fetch_backscatter, get_default_date_range
from change_point import assess_prior_structure, detect_change_point
from footprint import compute_footprint
from site_check import check_site

# Ground disturbance up to a month before the NTP is routine mobilisation, not a
# pre-existing structure. This was 12 days, the Sentinel-1 revisit interval — a
# property of the satellite that says nothing about how contracts actually start.
TOLERANCE_DAYS = 30
# Ground disturbance this far after the NTP is a delayed start, not an on-time
# one. Calibrated against the Betis River flood protection works — a project
# auditors verified as legitimate — whose first detectable earthworks appear 50
# days after NTP. A quarter allows for mobilisation and the 12-day revisit
# granularity without waving through a genuinely stalled project.
LATE_TOLERANCE_DAYS = 90

# Sentinel-1A reached its operational orbit in October 2014. Nothing before this
# can be analysed at all, and saying so is not the same as finding no activity.
SENTINEL1_COVERAGE_START = datetime(2014, 10, 3)



def evaluate_verdict(
    claimed_date_str: str,
    detected_date,
    confidence: float,
    prior_structure: dict | None = None,
    footprint: dict | None = None,
) -> dict:
    """Apply verdict logic and return verdict dict."""
    claimed = datetime.strptime(claimed_date_str, "%Y-%m-%d")

    # A structure already standing at the NTP settles the question on its own,
    # and it has to be checked first. Such a site produces no change point to
    # find — it was built before the window even opens — so the detector latches
    # onto whatever shifted later and the timeline logic reads that as a late
    # start. The evidence here is the level, not a date.
    if prior_structure and prior_structure.get("exists_before_ntp"):
        pre_db = prior_structure["pre_ntp_db"]
        rise_db = prior_structure["rise_db"]
        return {
            "verdict": "PRE_EXISTING",
            "explanation": (
                f"Before the contract Notice-to-Proceed, radar backscatter at this "
                f"coordinate already read {pre_db} dB above the surrounding land, "
                f"which is the signature of a hard structure rather than open "
                f"ground. Across the contract period that reading moved by "
                f"{rise_db:+.2f} dB, so the site ends the contract much as it "
                f"began. This timeline discrepancy may warrant review by an "
                f"authorized auditor.\n\n"
                "Top 3 Possibilities:\n"
                "• Pre-existing Structure: the works may relate to a prior structure or contract at the same site - records should be cross-checked.\n"
                "• Relocated Works: the contracted structure may have been built somewhere other than the approved site.\n"
                "• Coordinate Mismatch: the recorded GPS coordinates may point to an adjacent structure - physical verification is recommended."
            ),
            "days_difference": None,
        }

    if detected_date is None:
        # The footprint is deliberately not consulted here. Measured against the
        # audited set, neither the centroid offset nor the distance to the
        # nearest changed ground separated confirmed ghost projects from
        # confirmed real ones — real riverworks scored *further* from their
        # recorded point than ghosts did, on both metrics, with and without the
        # water mask. Until it discriminates, it travels as context in the
        # payload and decides nothing.
        return {
            "verdict": "NO_CHANGE_DETECTED",
            "explanation": (
                "No statistically significant change in radar backscatter was detected at this "
                "coordinate during the full analysis window. The satellite record does not show "
                "evidence of surface-level construction activity. This discrepancy may warrant "
                "further review by an authorized auditor.\n\n"
                "Top 3 Possibilities:\n"
                "• Absent Ground Activity: No surface disturbance consistent with construction was recorded — may warrant physical site verification.\n"
                "• Delayed Execution: The project may not have broken ground within the expected timeline.\n"
                "• Sub-surface / Radar-Invisible Work: Some work types (e.g., interior fit-out, drainage lining) do not alter surface radar reflectivity and would not appear in this analysis."
            ),
            "days_difference": None,
        }

    days_diff = int((detected_date - claimed).days)
    tolerance = timedelta(days=TOLERANCE_DAYS)

    late_tolerance = timedelta(days=LATE_TOLERANCE_DAYS)

    if detected_date > claimed + late_tolerance:
        return {
            "verdict": "DELAYED_START",
            "explanation": (
                f"Radar backscatter data indicates ground disturbance approximately "
                f"{days_diff} days after the contract Notice-to-Proceed date. Work "
                f"appears to have started well behind the contract timeline, which "
                f"may warrant review by an authorized auditor.\n\n"
                "Top 3 Possibilities:\n"
                "• Delayed Mobilization: The contractor may have broken ground months after the NTP was issued — schedule records should be cross-checked.\n"
                "• Billing Ahead of Work: Progress may have been billed for a period before any surface activity is visible in the satellite record.\n"
                "• Unrelated Disturbance: The detected change may reflect an unrelated event at the site rather than the contracted work — physical verification is recommended."
            ),
            "days_difference": days_diff,
        }

    if detected_date < claimed - tolerance:
        days_before = abs(days_diff)
        return {
            "verdict": "PRE_EXISTING",
            "explanation": (
                f"Radar backscatter data indicates significant ground disturbance approximately "
                f"{days_before} days before the contract Notice-to-Proceed date. This timeline "
                f"discrepancy may warrant review by an authorized auditor.\n\n"
                "Top 3 Possibilities:\n"
                "• Pre-existing Structure: The detected change may relate to a prior structure or contract at the same site — records should be cross-checked.\n"
                "• Early Mobilization: Site preparation may have begun before the NTP was formally issued, which may or may not be permissible under contract terms.\n"
                "• Coordinate Mismatch: The recorded GPS coordinates may point to an adjacent site — physical verification is recommended."
            ),
            "days_difference": days_diff,
        }
    else:
        return {
            "verdict": "CONSISTENT",
            "explanation": (
                "The detected construction start date is consistent with the contract timeline. "
                f"Backscatter change was observed within {LATE_TOLERANCE_DAYS} days of the "
                "Notice-to-Proceed date.\n\n"
                "Top 3 Possibilities:\n"
                "• Legitimate Execution: The project broke ground on schedule after the Notice-to-Proceed.\n"
                "• Coincidental Disturbance: Ground was broken by an unrelated event (e.g., land clearing by a private owner) exactly when the project was supposed to start.\n"
                "• Preparatory Work Only: Ground was cleared on schedule, but actual construction may have subsequently stalled."
            ),
            "days_difference": days_diff,
        }


def _location_mismatch(site: dict, timeline_verdict: str) -> dict:
    """
    Build the LOCATION_MISMATCH verdict for a coordinate that cannot be read.

    The reading itself still travels with the result — series, chart, and the
    timeline verdict the radar would have given — because an operator looking at
    a suspect coordinate still wants to see what is actually there. What changes
    is the headline: a confident finding about a rice field a kilometre from the
    river is an accusation the evidence does not support.
    """
    return {
        "verdict": "LOCATION_MISMATCH",
        "explanation": (
            f"{site['reason']}\n\n"
            f"The radar reading at this point would otherwise have been reported as "
            f"{timeline_verdict.replace('_', ' ').lower()}, but it describes whatever "
            f"surrounds the recorded coordinate rather than the contracted structure. "
            f"No conclusion should be drawn about the works until the location is "
            f"confirmed.\n\n"
            "Top 3 Possibilities:\n"
            "• Recording Error: the coordinate may have been entered or transcribed incorrectly.\n"
            "• Relocated Works: the structure may stand somewhere other than the approved site.\n"
            "• Unmapped Watercourse: a small creek or canal may be absent from the water dataset — physical verification is recommended."
        ),
        "days_difference": None,
    }


def analyze(
    lat: float,
    lon: float,
    claimed_date: str,
    project_name: str = "Custom Lookup",
    include_footprint: bool = True,
) -> dict:
    """
    Full analysis pipeline: GEE fetch → change point → verdict.
    Returns a dict matching the AnalysisResult shape in mockData.ts
    """
    # Coordinate plausibility runs as a caveat, not a gate. A point far from
    # any water is very likely wrong, but blocking on it left the operator with
    # no reading at all — so the analysis proceeds and the doubt travels with
    # the result for them to weigh.
    site = check_site(lat, lon, project_name)

    start_date, end_date = get_default_date_range(claimed_date)

    try:
        df = fetch_backscatter(lat, lon, start_date, end_date)
    except ValueError as e:
        # No usable imagery. This must NOT fall through to NO_CHANGE_DETECTED:
        # that verdict means "we looked and construction was absent", which
        # reads as a possible ghost project. Absent data is not absent activity,
        # and conflating them puts an unfounded finding against a contractor.
        claimed = datetime.strptime(claimed_date, "%Y-%m-%d")
        if claimed < SENTINEL1_COVERAGE_START:
            detail = (
                f"The contract Notice-to-Proceed date ({claimed_date}) predates the "
                f"Sentinel-1 radar archive, which begins "
                f"{SENTINEL1_COVERAGE_START.strftime('%B %Y')}. There is no satellite "
                "record for this period, so this project cannot be assessed by this method."
            )
        else:
            detail = str(e)
        return {
            "series": [],
            "change_point": {
                "detected_date": None,
                "confidence": 0.0,
                "days_difference": None,
            },
            "verdict": "INSUFFICIENT_DATA",
            "explanation": (
                f"{detail}\n\n"
                "No conclusion should be drawn about this project from this result — "
                "it reports a gap in the satellite record, not a finding about the work."
            ),
            "claimed_date": claimed_date,
            "coordinates": {"lat": lat, "lon": lon},
            "project_name": project_name,
            "site_check": site,
        }

    result = detect_change_point(df)
    prior_structure = assess_prior_structure(df, datetime.strptime(claimed_date, "%Y-%m-%d"))

    # Where the change is, not just when. Costs an extra Earth Engine round trip,
    # so batch callers that only need the timeline can switch it off.
    footprint = (
        compute_footprint(lat, lon, claimed_date)
        if include_footprint
        else {"available": False, "reason": "Footprint measurement was skipped."}
    )

    verdict_data = evaluate_verdict(
        claimed_date, result.detected_date, result.confidence, prior_structure, footprint
    )

    # An implausible coordinate outranks whatever the radar found there. The
    # timeline verdict is kept rather than discarded — the operator can still see
    # what the reading said, it just stops being the headline.
    timeline_verdict = verdict_data["verdict"]
    if not site["is_plausible"] and site.get("reason"):
        verdict_data = _location_mismatch(site, timeline_verdict)

    # Build series in the same shape as mockData.ts
    series = []
    for _, row in result.smoothed_series.iterrows():
        date_val = row["date"]
        series.append({
            "date": date_val.strftime("%Y-%m-%d") if hasattr(date_val, "strftime") else str(date_val),
            "backscatter_db": round(float(row["backscatter_db"]), 2),
            "smoothed_db": round(float(row.get("smoothed_db", row["backscatter_db"])), 2),
        })

    return {
        "series": series,
        "change_point": {
            "detected_date": result.detected_date.strftime("%Y-%m-%d") if result.detected_date else None,
            "confidence": result.confidence,
            "days_difference": verdict_data["days_difference"],
        },
        "verdict": verdict_data["verdict"],
        "explanation": verdict_data["explanation"],
        "claimed_date": claimed_date,
        "coordinates": {"lat": lat, "lon": lon},
        "project_name": project_name,
        "site_check": site,
        "prior_structure": prior_structure,
        "footprint": footprint,
        # What the timeline logic concluded before any override. Equal to
        # `verdict` unless the coordinate was rejected.
        "timeline_verdict": timeline_verdict,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TerraGuard SAR Analysis")
    parser.add_argument("--lat", type=float, required=True)
    parser.add_argument("--lon", type=float, required=True)
    parser.add_argument("--date", type=str, required=True, help="Claimed NTP date YYYY-MM-DD")
    parser.add_argument("--name", type=str, default="Custom Lookup")
    args = parser.parse_args()

    output = analyze(args.lat, args.lon, args.date, args.name)
    print(json.dumps(output))
