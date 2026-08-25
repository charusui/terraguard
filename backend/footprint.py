"""
footprint.py
------------
Measures *where* the ground changed around a coordinate, and how much of it.

The change detector reads one 30 m buffer and answers a question about time: on
what date did this spot move. It cannot answer the question an auditor asks next
— "then where is the structure?" — because a single point has no geometry.

Two numbers come out of here:

  area_m2            how much ground changed inside the search box
  centroid_offset_m  how far that change sits from the recorded coordinate

The offset matters because COA's own findings cite unauthorized relocations, and
reporting has said DPWH-published coordinates were manipulated for some
projects. A site that reads flat while fresh construction sits 300 m away is a
different finding from a site where nothing was built at all, and the current
pipeline reports both as NO_CHANGE_DETECTED.

This is not a location fix. The search box is centred on the claimed coordinate,
so the answer is "the nearest construction-like change to the point you gave
me", never "the true site". Treat it as a lead for a field visit.

Fetching and geometry only; verdict wording lives in analyze.py.
"""

import math
from datetime import datetime, timedelta

import ee

from sar_fetch import initialize

# Radius of the search box around the claimed coordinate. Wide enough to catch a
# relocation to the far bank or a few hundred metres upstream; narrow enough that
# an unrelated subdivision going up nearby does not routinely land inside it.
SEARCH_RADIUS_METERS = 400

# Backscatter rise that counts as construction. Structures harden a surface, so
# the change of interest is one-directional: concrete, rock armour and steel all
# scatter more than the bare ground they replace. Looking at absolute change
# instead would sweep in every field that dried out between passes.
#
# Measured on three audited cases, sweeping 1.5 / 2.5 / 3.5 / 4.5 dB. At 1.5 the
# reading is worthless — a verified ghost site returned 6% of the search box as
# "changed", which is farmland, not a structure. By 3.5 the opposite failure
# appears: the Betis River works, which auditors confirmed were built, shrink to
# 1,900 m² and then vanish. 2.5 is the only value tested where the legitimate
# project stands clearly above the ghost — 7,380 m² against 1,153.
#
# Three cases is a small sample. Re-measure when verified_cases.py grows.
CHANGE_THRESHOLD_DB = 2.5

# Composite windows either side of the NTP. Ninety days before is a stable
# baseline; a hundred and eighty after allows for mobilisation without running
# so long that later, unrelated work contaminates the reading.
PRE_WINDOW_DAYS = 90
POST_WINDOW_DAYS = 180

# Minimum contiguous size for a blob to be believed, in 10 m pixels. Speckle
# survives the smoothing filter as isolated pixels; a real structure does not
# appear as three scattered dots.
MIN_COMPONENT_PIXELS = 5

# Distance-transform search radius in 10 m pixels, so ~2.5 km — comfortably past
# the search box, which keeps "no change anywhere near" a finite number.
_DISTANCE_SEARCH_PIXELS = 256

# Terrain steeper than this produces radar shadow and layover that read as change
# regardless of what is on the ground.
MAX_SLOPE_DEGREES = 15

# JRC surface water, same threshold as site_check. Seasonal flooding otherwise
# reads as construction — which would be a spectacular failure mode given the
# projects being audited are flood control works.
WATER_DATASET = "JRC/GSW1_4/GlobalSurfaceWater"
WATER_OCCURRENCE_THRESHOLD = 20

EARTH_RADIUS_METERS = 6371000.0

_COMPASS = ("north", "northeast", "east", "southeast",
            "south", "southwest", "west", "northwest")


def _haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two coordinates, in metres."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = phi2 - phi1
    d_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * EARTH_RADIUS_METERS * math.asin(min(1.0, math.sqrt(a)))


def _bearing_label(lat1: float, lon1: float, lat2: float, lon2: float) -> str:
    """Compass direction from the first coordinate to the second."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_lambda = math.radians(lon2 - lon1)
    y = math.sin(d_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(d_lambda)
    degrees = (math.degrees(math.atan2(y, x)) + 360) % 360
    return _COMPASS[int((degrees + 22.5) % 360 // 45)]


def _composite(aoi, start: str, end: str):
    """Median VV composite over a window, or None when the window is empty."""
    collection = (
        ee.ImageCollection("COPERNICUS/S1_GRD")
        .filterBounds(aoi)
        .filterDate(start, end)
        .filter(ee.Filter.eq("instrumentMode", "IW"))
        .select("VV")
    )
    return collection.median()


def _stable_ground_mask(aoi, mask_water: bool = True):
    """Pixels where a backscatter rise can be trusted to mean construction."""
    slope_ok = ee.Terrain.slope(ee.Image("USGS/SRTMGL1_003")).lt(MAX_SLOPE_DEGREES)
    if not mask_water:
        return slope_ok.clip(aoi)
    dry = (
        ee.Image(WATER_DATASET)
        .select("occurrence")
        .unmask(0)
        .lte(WATER_OCCURRENCE_THRESHOLD)
    )
    return slope_ok.And(dry).clip(aoi)


def compute_footprint(
    lat: float,
    lon: float,
    claimed_date: str,
    search_radius_m: int = SEARCH_RADIUS_METERS,
    threshold_db: float = CHANGE_THRESHOLD_DB,
    mask_water: bool = True,
) -> dict:
    """
    Measure the ground change around a coordinate.

    Args:
        lat, lon: the recorded coordinate
        claimed_date: contract NTP, ISO 'YYYY-MM-DD'
        search_radius_m: radius of the search box

    Returns:
        {
          "available":          bool,   False when the measurement could not run
          "area_m2":            float|None,  changed ground inside the box
          "centroid_offset_m":  float|None,  distance to the centre of the change
          "nearest_change_m":   float|None,  distance to the closest changed ground
          "centroid":           {"lat", "lon"}|None,
          "direction":          str|None,    e.g. "northeast"
          "search_radius_m":    int,
          "reason":             str|None,    why it is unavailable
        }

    Never raises. A failed measurement returns available=False, because a
    footprint that could not be read must not become evidence of an empty site.
    """
    result = {
        "available": False,
        "area_m2": None,
        "centroid_offset_m": None,
        "nearest_change_m": None,
        "centroid": None,
        "direction": None,
        "search_radius_m": search_radius_m,
        "reason": None,
    }

    try:
        claimed = datetime.strptime(claimed_date, "%Y-%m-%d")
    except ValueError:
        result["reason"] = "Claimed date is not a valid ISO date."
        return result

    pre_start = (claimed - timedelta(days=PRE_WINDOW_DAYS)).strftime("%Y-%m-%d")
    pre_end = claimed.strftime("%Y-%m-%d")
    post_end = min(claimed + timedelta(days=POST_WINDOW_DAYS), datetime.today())
    if post_end <= claimed:
        result["reason"] = "The contract date is in the future."
        return result

    try:
        initialize()
        aoi = ee.Geometry.Point([lon, lat]).buffer(search_radius_m)

        pre = _composite(aoi, pre_start, pre_end)
        post = _composite(aoi, claimed.strftime("%Y-%m-%d"), post_end.strftime("%Y-%m-%d"))

        # One-directional: a rise in backscatter, which is what hard surfaces do.
        risen = post.subtract(pre).gt(threshold_db)

        # Mode filter over a 20 m neighbourhood clears isolated speckle pixels
        # without eroding a genuine edge the way a larger kernel would.
        smoothed = risen.focal_mode(radius=20, units="meters")

        changed = (
            smoothed.updateMask(_stable_ground_mask(aoi, mask_water))
            .selfMask()
        )
        # Blobs smaller than a few pixels are noise that survived smoothing.
        big_enough = changed.connectedPixelCount(64, True).gte(MIN_COMPONENT_PIXELS)
        changed = changed.updateMask(big_enough)

        # Distance from the recorded point to the *nearest* changed ground, not
        # to the centre of mass. Flood-control works are linear: a 2 km dike
        # correctly detected still puts its centroid hundreds of metres from any
        # single coordinate, which made the centroid read as "built elsewhere" on
        # projects auditors had confirmed. What actually distinguishes a
        # relocation is that nothing changed *near* the point at all.
        nearest = (
            changed.unmask(0)
            .fastDistanceTransform(_DISTANCE_SEARCH_PIXELS)
            .sqrt()
            .multiply(ee.Image.pixelArea().sqrt())
            .reduceRegion(
                reducer=ee.Reducer.first(),
                geometry=ee.Geometry.Point([lon, lat]),
                scale=10,
                maxPixels=1e9,
            )
        )

        area = changed.multiply(ee.Image.pixelArea()).reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=aoi,
            scale=10,
            maxPixels=1e9,
            bestEffort=True,
        )
        # Mean lon/lat of the surviving pixels is the centre of mass of the
        # change — the single number that says "the work is over there".
        centre = ee.Image.pixelLonLat().updateMask(changed).reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=aoi,
            scale=10,
            maxPixels=1e9,
            bestEffort=True,
        )

        # Both reducers in one round trip; each getInfo() is a full request.
        stats = ee.Dictionary({
            "area_m2": area.values().get(0),
            "lon": centre.get("longitude"),
            "lat": centre.get("latitude"),
            "nearest_change_m": nearest.values().get(0),
        }).getInfo()
    except Exception as exc:  # noqa: BLE001 — advisory measurement, never fatal
        print(f"footprint: measurement failed for ({lat}, {lon}): {exc}")
        result["reason"] = "The footprint measurement could not be completed."
        return result

    area_m2 = stats.get("area_m2")
    centre_lat = stats.get("lat")
    centre_lon = stats.get("lon")

    result["available"] = True
    result["area_m2"] = round(float(area_m2), 1) if area_m2 is not None else 0.0
    nearest_m = stats.get("nearest_change_m")
    result["nearest_change_m"] = round(float(nearest_m), 1) if nearest_m is not None else None

    # No surviving pixels means no centroid. That is a real answer — nothing
    # construction-like changed anywhere in the box — not a failed measurement.
    if centre_lat is None or centre_lon is None:
        return result

    offset = _haversine_meters(lat, lon, float(centre_lat), float(centre_lon))
    result["centroid"] = {"lat": round(float(centre_lat), 6), "lon": round(float(centre_lon), 6)}
    result["centroid_offset_m"] = round(offset, 1)
    result["direction"] = _bearing_label(lat, lon, float(centre_lat), float(centre_lon))
    return result
