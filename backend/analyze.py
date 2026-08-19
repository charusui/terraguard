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
from change_point import detect_change_point

TOLERANCE_DAYS = 12  # Sentinel-1 revisit interval


def evaluate_verdict(claimed_date_str: str, detected_date, confidence: float) -> dict:
    """Apply verdict logic and return verdict dict."""
    claimed = datetime.strptime(claimed_date_str, "%Y-%m-%d")

    if detected_date is None:
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
                "Backscatter change was observed within the expected window following the "
                "Notice-to-Proceed date.\n\n"
                "Top 3 Possibilities:\n"
                "• Legitimate Execution: The project broke ground on schedule after the Notice-to-Proceed.\n"
                "• Coincidental Disturbance: Ground was broken by an unrelated event (e.g., land clearing by a private owner) exactly when the project was supposed to start.\n"
                "• Preparatory Work Only: Ground was cleared on schedule, but actual construction may have subsequently stalled."
            ),
            "days_difference": days_diff,
        }


def analyze(lat: float, lon: float, claimed_date: str, project_name: str = "Custom Lookup") -> dict:
    """
    Full analysis pipeline: GEE fetch → change point → verdict.
    Returns a dict matching the AnalysisResult shape in mockData.ts
    """
    start_date, end_date = get_default_date_range(claimed_date)

    try:
        df = fetch_backscatter(lat, lon, start_date, end_date)
    except ValueError as e:
        # E.g., if there is no Sentinel-1 data for the historical period
        verdict_data = evaluate_verdict(claimed_date, None, 0.0)
        return {
            "series": [],
            "change_point": {
                "detected_date": None,
                "confidence": 0.0,
                "days_difference": None,
            },
            "verdict": verdict_data["verdict"],
            "explanation": verdict_data["explanation"],
            "claimed_date": claimed_date,
            "coordinates": {"lat": lat, "lon": lon},
            "project_name": project_name,
        }

    result = detect_change_point(df)

    verdict_data = evaluate_verdict(claimed_date, result.detected_date, result.confidence)

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
