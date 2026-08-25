"""
run_batch.py
------------
Scores a whole contract CSV offline and writes a ranked worklist.

Thousands of lookups cannot run inside a serverless request — each project needs
its own Earth Engine round trips, and the function would time out long before
the list was done. So the national-scale path is this script: run it once, write
the results, and let the app read what it produced.

Usage:
    python backend/triage/run_batch.py contracts.csv -o worklist.csv

Input columns:
    name, lat, lon, claimed_ntp_date          required
    cost, length_m, width_m, expected_area_m2 optional, enable the rate and
    contractor, district                      scope and concentration checks

Rows that fail to analyse are kept in the output with their error, rather than
dropped. A project silently missing from a worklist is worse than one marked
unreadable — nobody goes looking for the row that was never printed.
"""

import argparse
import csv
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analyze import analyze  # noqa: E402
from triage.contract_features import compute_flags  # noqa: E402
from triage.rank import rank  # noqa: E402

REQUIRED_COLUMNS = ("name", "lat", "lon", "claimed_ntp_date")


def read_contracts(path: str) -> list[dict]:
    with open(path, newline="", encoding="utf-8-sig") as handle:
        rows = [dict(row) for row in csv.DictReader(handle)]

    if not rows:
        raise SystemExit(f"{path} has no data rows.")

    missing = [c for c in REQUIRED_COLUMNS if c not in rows[0]]
    if missing:
        raise SystemExit(f"{path} is missing required column(s): {', '.join(missing)}")
    return rows


def expected_area(row: dict):
    """Contracted footprint in m², or None when the contract does not say."""
    def number(key):
        value = (row.get(key) or "").replace(",", "").strip()
        try:
            return float(value)
        except ValueError:
            return None

    explicit = number("expected_area_m2")
    if explicit:
        return explicit
    length, width = number("length_m"), number("width_m")
    return length * width if length and width else None


def analyse_all(rows: list[dict], include_footprint: bool) -> list[dict]:
    analyses = []
    for index, row in enumerate(rows, start=1):
        name = row.get("name") or f"Row {index}"
        print(f"[{index}/{len(rows)}] {name[:60]}", flush=True)
        try:
            analyses.append(analyze(
                float(row["lat"]),
                float(row["lon"]),
                row["claimed_ntp_date"],
                name,
                include_footprint=include_footprint,
            ))
        except Exception as exc:  # noqa: BLE001 — one bad row must not end the run
            print(f"    failed: {exc}", flush=True)
            analyses.append({
                "project_name": name,
                "verdict": "INSUFFICIENT_DATA",
                "explanation": str(exc),
                "coordinates": {"lat": row.get("lat"), "lon": row.get("lon")},
                "claimed_date": row.get("claimed_ntp_date"),
                "change_point": {"detected_date": None, "confidence": 0.0, "days_difference": None},
                "error": str(exc),
            })
    return analyses


def write_csv(path: str, rows: list[dict], analyses: list[dict], ranked: list[dict]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow([
            "rank", "score", "priority", "project", "lat", "lon",
            "claimed_ntp_date", "verdict", "detected_date", "reasons",
        ])
        for entry in ranked:
            analysis = analyses[entry["index"]]
            row = rows[entry["index"]]
            writer.writerow([
                entry["rank"],
                entry["score"],
                entry["priority"],
                entry["project_name"],
                row.get("lat"),
                row.get("lon"),
                row.get("claimed_ntp_date"),
                entry["verdict"],
                (analysis.get("change_point") or {}).get("detected_date") or "",
                " | ".join(entry["reasons"]),
            ])


def main() -> None:
    parser = argparse.ArgumentParser(description="TerraGuard portfolio triage")
    parser.add_argument("csv_path", help="Contract CSV to score")
    parser.add_argument("-o", "--output", default="worklist.csv", help="Where to write the ranked list")
    parser.add_argument("--json", dest="json_path", help="Also write the full result as JSON")
    parser.add_argument(
        "--no-footprint",
        action="store_true",
        help="Skip the footprint measurement — roughly halves the Earth Engine calls",
    )
    args = parser.parse_args()

    rows = read_contracts(args.csv_path)
    started = datetime.now()

    analyses = analyse_all(rows, include_footprint=not args.no_footprint)
    flags = compute_flags(rows)
    ranked = rank(analyses, flags, [expected_area(row) for row in rows])

    write_csv(args.output, rows, analyses, ranked)
    if args.json_path:
        with open(args.json_path, "w", encoding="utf-8") as handle:
            json.dump({"ranked": ranked, "analyses": analyses}, handle, indent=2, default=str)

    high = [r for r in ranked if r["priority"] == "high"]
    medium = [r for r in ranked if r["priority"] == "medium"]
    elapsed = (datetime.now() - started).total_seconds()

    print()
    print(f"  scored {len(ranked)} contracts in {elapsed:,.0f}s")
    print(f"  high priority   : {len(high)}")
    print(f"  medium priority : {len(medium)}")
    print(f"  written to      : {args.output}")
    if high:
        print()
        print("  Top of the worklist:")
        for entry in high[:10]:
            print(f"    {entry['rank']:>3}. [{entry['score']:>3}] {entry['project_name'][:48]}")
            print(f"         {entry['reasons'][0] if entry['reasons'] else ''}")


if __name__ == "__main__":
    main()
