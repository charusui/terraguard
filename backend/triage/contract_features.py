"""
contract_features.py
--------------------
Red flags that live in the contract table, not in the imagery.

Satellite analysis answers one project at a time. Some of the strongest signals
only appear when the whole list is read together — two contracts claiming the
same stretch of riverbank in different years is invisible to any single lookup,
and invisible to any imagery tool, because it is a property of the records
rather than of the ground.

Everything here is arithmetic over the rows. No network, no Earth Engine, no
model. That is deliberate: a flag an auditor can recompute in a spreadsheet is
one they can defend in a report.

Each flag returns a magnitude and a sentence. The sentence is what an auditor
reads, so it names the specific thing found rather than the rule that fired.
"""

import math
from collections import defaultdict

EARTH_RADIUS_METERS = 6371000.0

# Two coordinates closer than this are treated as the same site. Sized above
# ordinary GPS scatter and below the length of a typical flood-control section,
# so genuinely adjacent phases of one long project are not merged.
DUPLICATE_RADIUS_METERS = 100

# Robust z-score past which a cost per metre is called out. 3.5 on a median /
# MAD scale is the usual threshold for "not part of this distribution"; the
# distribution here has a heavy right tail by construction, so a mean-and-sigma
# test would flag half the list.
COST_OUTLIER_Z = 3.5

# Used when every comparable row bills an identical rate, which leaves the MAD
# at zero and no scale to measure against. A plain multiple of the median keeps
# the check alive in that degenerate case.
COST_RATIO_FALLBACK = 3.0

# A contractor holding more than this share of a district's contracts is worth
# a look. Not evidence of anything on its own — small districts have few
# qualified bidders — which is why it scores low and says so.
CONTRACTOR_SHARE_THRESHOLD = 0.4
MIN_DISTRICT_CONTRACTS = 5


def _haversine_meters(lat1, lon1, lat2, lon2) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = phi2 - phi1
    d_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * EARTH_RADIUS_METERS * math.asin(min(1.0, math.sqrt(a)))


def _to_float(value):
    """Parse a spreadsheet cell into a number, tolerating commas and currency."""
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    cleaned = str(value).replace(",", "").replace("₱", "").replace("P", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


def _median(values):
    ordered = sorted(values)
    n = len(ordered)
    if n == 0:
        return None
    mid = n // 2
    return ordered[mid] if n % 2 else (ordered[mid - 1] + ordered[mid]) / 2


def find_duplicate_coordinates(rows, radius_m=DUPLICATE_RADIUS_METERS):
    """
    Group rows that sit on top of each other.

    Returns {row_index: [other_row_index, ...]}.

    Buckets by a grid roughly the size of the search radius and compares only
    within neighbouring cells, so a nine-thousand-row list does not become an
    eighty-one-million-pair comparison.
    """
    cell = radius_m / 111_000.0  # degrees latitude per radius, near enough
    buckets = defaultdict(list)

    for i, row in enumerate(rows):
        lat, lon = _to_float(row.get("lat")), _to_float(row.get("lon"))
        if lat is None or lon is None:
            continue
        buckets[(int(lat / cell), int(lon / cell))].append(i)

    matches = defaultdict(list)
    for (cy, cx), indices in buckets.items():
        neighbours = []
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                neighbours.extend(buckets.get((cy + dy, cx + dx), []))

        for i in indices:
            a = rows[i]
            for j in neighbours:
                if j <= i:
                    continue
                b = rows[j]
                distance = _haversine_meters(
                    _to_float(a["lat"]), _to_float(a["lon"]),
                    _to_float(b["lat"]), _to_float(b["lon"]),
                )
                if distance <= radius_m:
                    matches[i].append(j)
                    matches[j].append(i)
    return matches


def _cost_per_meter_flags(rows):
    """Robust outlier test on cost per metre, where both fields are present."""
    values = {}
    for i, row in enumerate(rows):
        cost = _to_float(row.get("cost"))
        length = _to_float(row.get("length_m"))
        if cost and length and length > 0:
            values[i] = cost / length

    # Too few comparable rows and "outlier" means nothing.
    if len(values) < 5:
        return {}

    series = list(values.values())
    median = _median(series)
    deviations = [abs(v - median) for v in series]
    mad = _median(deviations) or 0.0

    flags = {}
    for i, value in values.items():
        if mad > 0:
            # 0.6745 converts MAD to a standard-deviation-equivalent scale.
            magnitude = 0.6745 * (value - median) / mad
            is_outlier = magnitude >= COST_OUTLIER_Z
        else:
            # Every comparable row bills the same rate, so the spread is zero and
            # no z-score exists. Rather than disable the check — which would let
            # the one row charging ten times the going rate through untouched —
            # fall back to a plain multiple of the median.
            magnitude = value / median if median else 0.0
            is_outlier = magnitude >= COST_RATIO_FALLBACK

        if is_outlier:
            flags[i] = {
                "id": "cost_outlier",
                "magnitude": round(magnitude, 1),
                "reason": (
                    f"Cost per metre is ₱{value:,.0f} against a list median of "
                    f"₱{median:,.0f} — {value / median:.1f}x the typical rate."
                ),
            }
    return flags


def _contractor_concentration_flags(rows):
    """Contractors holding an unusual share of one district's contracts."""
    by_district = defaultdict(list)
    for i, row in enumerate(rows):
        district = (row.get("district") or "").strip()
        contractor = (row.get("contractor") or "").strip()
        if district and contractor:
            by_district[district].append((i, contractor))

    flags = {}
    for district, entries in by_district.items():
        if len(entries) < MIN_DISTRICT_CONTRACTS:
            continue
        counts = defaultdict(int)
        for _, contractor in entries:
            counts[contractor] += 1
        for i, contractor in entries:
            share = counts[contractor] / len(entries)
            if share >= CONTRACTOR_SHARE_THRESHOLD:
                flags[i] = {
                    "id": "contractor_concentration",
                    "magnitude": round(share, 2),
                    "reason": (
                        f"{contractor} holds {counts[contractor]} of "
                        f"{len(entries)} contracts in {district} "
                        f"({share:.0%} of the district)."
                    ),
                }
    return flags


def compute_flags(rows: list[dict]) -> list[list[dict]]:
    """
    Read the whole contract list and return the flags raised against each row.

    Args:
        rows: contract records. `lat` and `lon` drive the duplicate check;
              `cost` and `length_m` drive the rate check; `contractor` and
              `district` drive the concentration check. Missing fields simply
              skip their check rather than failing.

    Returns:
        One list of flags per row, in the same order. Each flag is
        {"id", "magnitude", "reason"}.
    """
    flags: list[list[dict]] = [[] for _ in rows]

    duplicates = find_duplicate_coordinates(rows)
    for i, others in duplicates.items():
        names = [rows[j].get("name") or f"row {j + 1}" for j in others[:3]]
        listed = ", ".join(names)
        if len(others) > 3:
            listed += f", and {len(others) - 3} more"
        flags[i].append({
            "id": "duplicate_coordinates",
            "magnitude": len(others),
            "reason": (
                f"Shares this location (within {DUPLICATE_RADIUS_METERS} m) with "
                f"{listed}."
            ),
        })

    for i, flag in _cost_per_meter_flags(rows).items():
        flags[i].append(flag)

    for i, flag in _contractor_concentration_flags(rows).items():
        flags[i].append(flag)

    return flags
