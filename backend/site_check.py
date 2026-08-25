"""
site_check.py
-------------
Checks whether a coordinate can plausibly host the structure its contract
describes, before any change detection is attempted.

This exists because the change detector was being asked impossible questions. A
contract reading "construction of flood control structure along Guiguinto River"
carries a coordinate 1,098 m from the nearest watercourse; the radar dutifully
analysed a rice field and returned a confident verdict about a wall it never
saw. Both radar and optical failed to separate verified-built from
verified-never-built projects at these points, which is the signature of bad
input rather than bad analysis.

A failed check is not a null result. Reporting has said DPWH-published
coordinates were manipulated for some projects, and COA's own findings cite
"unauthorized relocations" and "mismatched sites" — so a river wall recorded
far from any river is itself the kind of discrepancy an audit cares about.

Fetching and geometry only; the verdict wording lives in analyze.py.
"""

import ee

from sar_fetch import initialize

# JRC Global Surface Water. Occurrence is the percentage of observations from
# 1984-2021 in which a pixel held water, so a threshold keeps permanent and
# seasonal watercourses while discarding transient flooding.
WATER_DATASET = "JRC/GSW1_4/GlobalSurfaceWater"
WATER_OCCURRENCE_THRESHOLD = 20

# How far a water-adjacent structure may sit from mapped water before the
# coordinate is treated as unusable. Generous on purpose: the water mask is
# 30 m, narrow creeks and canals go unmapped entirely, and a legitimate site can
# sit back from the bank. Distances in the hundreds of metres pass; the cases
# this is meant to catch are kilometres out.
MAX_WATER_DISTANCE_METERS = 750

# Distance transform search radius in pixels (30 m each), so ~7.7 km.
_DISTANCE_SEARCH_PIXELS = 256

# Words in a project description that imply the works sit on a watercourse.
WATER_KEYWORDS = (
    "river", "creek", "canal", "waterway", "drainage", "flood",
    "riverbank", "riverwall", "revetment", "dike", "dam", "slope protection",
    "outfall", "spur dike", "floodway", "estero", "channel",
)


def expects_water(description: str) -> bool:
    """True when a project description implies a watercourse-adjacent structure."""
    if not description:
        return False
    lowered = description.lower()
    return any(keyword in lowered for keyword in WATER_KEYWORDS)


def distance_to_water(lat: float, lon: float) -> float | None:
    """
    Metres from the coordinate to the nearest mapped watercourse.

    Returns None if the distance cannot be computed. Returns a value at the
    search-radius ceiling when no water is found within range.
    """
    try:
        # analyze() runs this before any fetch, so GEE may not be up yet.
        initialize()
        water = (
            ee.Image(WATER_DATASET)
            .select("occurrence")
            .gt(WATER_OCCURRENCE_THRESHOLD)
            .selfMask()
        )
        distance = (
            water.fastDistanceTransform(_DISTANCE_SEARCH_PIXELS)
            .sqrt()
            .multiply(ee.Image.pixelArea().sqrt())
        )
        sampled = distance.reduceRegion(
            reducer=ee.Reducer.first(),
            geometry=ee.Geometry.Point([lon, lat]),
            scale=30,
            maxPixels=1e9,
        ).getInfo()
    except Exception as exc:  # noqa: BLE001 — the check is advisory, never fatal
        print(f"site_check: distance lookup failed for ({lat}, {lon}): {exc}")
        return None

    if not sampled:
        return None
    value = next(iter(sampled.values()), None)
    return float(value) if value is not None else None


def check_site(lat: float, lon: float, project_name: str = "") -> dict:
    """
    Assess whether this coordinate can host the structure the project describes.

    Returns:
        {
          "is_plausible":      bool,  True unless the check positively failed
          "expects_water":     bool,  whether the description implies a watercourse
          "water_distance_m":  float|None,
          "reason":            str|None, operator-facing explanation on failure
        }

    An unavailable check returns is_plausible=True: it must never manufacture a
    finding out of its own failure.
    """
    result = {
        "is_plausible": True,
        "expects_water": expects_water(project_name),
        "water_distance_m": None,
        "reason": None,
    }

    if not result["expects_water"]:
        return result

    distance = distance_to_water(lat, lon)
    result["water_distance_m"] = distance
    if distance is None:
        return result

    if distance > MAX_WATER_DISTANCE_METERS:
        result["is_plausible"] = False
        result["reason"] = (
            f"This project describes work on a watercourse, but the recorded "
            f"coordinate sits {distance:,.0f} m from the nearest mapped water. "
            f"The location is very likely wrong, so any satellite reading here "
            f"describes the surrounding land rather than the structure."
        )

    return result
