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
                "No statistically significant change in backscatter was detected at this "
                "coordinate during the entire analysis window. Despite billing claims, the "
                "satellite record shows no evidence of construction activity.\n\n"
                "Top 3 Possibilities:\n"
                "• Ghost Project: The infrastructure was never built, despite billing claims.\n"
                "• Severely Delayed Execution: The project has not yet broken ground.\n"
                "• Sub-surface / Invisible Work: The work performed did not alter the ground surface roughness enough to be detected by radar (e.g., interior renovations)."
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
                f"Satellite backscatter data shows significant ground disturbance approximately "
                f"{days_before} days BEFORE the contract Notice-to-Proceed date.\n\n"
                "Top 3 Possibilities:\n"
                "• Recycled Infrastructure Fraud: The contractor is claiming a new project on an asset already built by a previous contract.\n"
                "• Retroactive Awarding: Construction began long before the official Notice-to-Proceed was actually signed.\n"
                "• Misaligned Coordinates: The GPS coordinate provided points to an older, adjacent structure rather than the true project site."
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
        return {"error": str(e)}

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
