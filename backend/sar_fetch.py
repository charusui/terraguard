"""
sar_fetch.py
------------
Fetches Sentinel-1 GRD VV backscatter time series from Google Earth Engine
for a given coordinate and date range.
"""

import os
from pathlib import Path

# Load .env — try repo root first (local dev), then project root (Vercel).
# On Vercel env vars are injected by the platform, so this is a no-op there.
try:
    from dotenv import load_dotenv
    _here = Path(__file__).resolve().parent
    for _candidate in [_here.parent / ".env", _here / ".env"]:
        if _candidate.exists():
            load_dotenv(_candidate)
            break
except Exception:
    pass

import ee
import pandas as pd
from datetime import datetime, timedelta

GEE_PROJECT = "satellite-hackathon-505804"
KEY_FILE = os.path.join(os.path.dirname(__file__), "service-account-key.json")

# Reference annulus around the site, used to cancel region-wide moisture and
# seasonal swings. Inner radius clears the works themselves; outer radius stays
# close enough to share weather and land cover.
REFERENCE_INNER_METERS = 300
REFERENCE_OUTER_METERS = 1000


def initialize():
    """Initialize GEE using service account key file or environment variable."""
    try:
        ee.Initialize(project=GEE_PROJECT)
        return  # Already initialized
    except Exception:
        pass

    import json

    # Check for key in environment variable (for Vercel/production)
    key_json = os.environ.get("GEE_SERVICE_ACCOUNT_KEY")
    if key_json:
        import google.oauth2.service_account as sa
        credentials = sa.Credentials.from_service_account_info(
            json.loads(key_json),
            scopes=["https://www.googleapis.com/auth/earthengine"],
        )
        ee.Initialize(credentials=credentials, project=GEE_PROJECT)
        return

    # Fall back to local key file for development
    if os.path.exists(KEY_FILE):
        import google.oauth2.service_account as sa
        credentials = sa.Credentials.from_service_account_file(
            KEY_FILE,
            scopes=["https://www.googleapis.com/auth/earthengine"],
        )
        ee.Initialize(credentials=credentials, project=GEE_PROJECT)
        return

    raise RuntimeError(
        "No GEE credentials found. Either place service-account-key.json in the backend/ "
        "directory or set the GEE_SERVICE_ACCOUNT_KEY environment variable."
    )


def fetch_backscatter(
    lat: float,
    lon: float,
    start_date: str,
    end_date: str,
    buffer_meters: int = 30,
    reference_inner_meters: int = REFERENCE_INNER_METERS,
    reference_outer_meters: int = REFERENCE_OUTER_METERS,
) -> pd.DataFrame:
    """
    Fetch Sentinel-1 VV backscatter for a coordinate, alongside a local
    reference reading from the land surrounding it.

    Backscatter responds to surface moisture as much as to structures, so the
    whole region shifts together when a wet season ends. Measured on its own, a
    site cannot tell that apart from construction. Sampling an annulus around
    the site in the same pass gives a control: whatever moves in both is
    environmental, and what remains is local to the site.

    The annulus starts well outside the site buffer so the works themselves do
    not contaminate the reference, and stays close enough to share weather,
    land cover, and the same satellite pass.

    Args:
        lat: Latitude (decimal degrees)
        lon: Longitude (decimal degrees)
        start_date: ISO date string e.g. '2022-01-01'
        end_date: ISO date string e.g. '2024-01-01'
        buffer_meters: Spatial buffer around the point (default 30m ~ 1 GRD pixel)
        reference_inner_meters: Inner radius of the reference annulus
        reference_outer_meters: Outer radius of the reference annulus

    Returns:
        pd.DataFrame with columns:
            date            (datetime)
            backscatter_db  (float) raw site reading
            reference_db    (float) surrounding-area reading, NaN if unavailable
            relative_db     (float) site minus reference, falling back to the
                            raw site reading when no reference is available

    Raises:
        ValueError: If no Sentinel-1 images found for the location/date range
    """
    initialize()

    point = ee.Geometry.Point([lon, lat])
    buffered = point.buffer(buffer_meters)
    reference_ring = point.buffer(reference_outer_meters).difference(
        point.buffer(reference_inner_meters)
    )

    collection = (
        ee.ImageCollection("COPERNICUS/S1_GRD")
        .filterBounds(buffered)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.eq("instrumentMode", "IW"))
        .select("VV")
    )

    count = collection.size().getInfo()
    if count == 0:
        raise ValueError(
            f"No Sentinel-1 IW images found for ({lat}, {lon}) "
            f"between {start_date} and {end_date}. "
            "Check that coordinates are over land (not ocean) and the date range is valid."
        )

    def extract_mean(image):
        site = image.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=buffered,
            scale=10,
            maxPixels=1e9,
        )
        # Median over the ring: robust to a neighbouring site that is itself
        # under construction, which a mean would let drag the reference.
        reference = image.reduceRegion(
            reducer=ee.Reducer.median(),
            geometry=reference_ring,
            scale=30,
            maxPixels=1e9,
            bestEffort=True,
        )
        return ee.Feature(None, {
            "date": image.date().format("YYYY-MM-dd"),
            "backscatter_db": site.get("VV"),
            "reference_db": reference.get("VV"),
        })

    features = collection.map(extract_mean).getInfo()["features"]

    rows = []
    for f in features:
        props = f["properties"]
        if props.get("backscatter_db") is None:
            continue
        reference = props.get("reference_db")
        rows.append({
            "date": datetime.strptime(props["date"], "%Y-%m-%d"),
            "backscatter_db": float(props["backscatter_db"]),
            "reference_db": float(reference) if reference is not None else float("nan"),
        })

    if not rows:
        raise ValueError(
            f"Sentinel-1 images were found but all had null VV values at ({lat}, {lon}). "
            "The location may be at the edge of a scene."
        )

    df = pd.DataFrame(rows).sort_values("date").reset_index(drop=True)

    # Detrended series the change detector actually reads. Where the reference
    # is missing we fall back to the raw reading rather than dropping the pass,
    # so coverage never gets worse than it was before detrending existed.
    has_reference = df["reference_db"].notna()
    df["relative_db"] = df["backscatter_db"]
    df.loc[has_reference, "relative_db"] = (
        df.loc[has_reference, "backscatter_db"] - df.loc[has_reference, "reference_db"]
    )

    return df


def get_default_date_range(claimed_ntp_date: str) -> tuple[str, str]:
    """
    Returns (start_date, end_date) defaulting to 150 days before claimed NTP
    through 365 days after.
    """
    claimed = datetime.strptime(claimed_ntp_date, "%Y-%m-%d")
    start = claimed - timedelta(days=150)
    end = claimed + timedelta(days=365)
    if end > datetime.today():
        end = datetime.today()
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")
