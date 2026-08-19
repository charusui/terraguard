"""
sar_fetch.py
------------
Fetches Sentinel-1 GRD VV backscatter time series from Google Earth Engine
for a given coordinate and date range.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from repo root (two levels up from backend/)
load_dotenv(Path(__file__).parent.parent / ".env")

import ee
import pandas as pd
from datetime import datetime, timedelta

GEE_PROJECT = "satellite-hackathon-505804"
KEY_FILE = os.path.join(os.path.dirname(__file__), "service-account-key.json")


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
) -> pd.DataFrame:
    """
    Fetch Sentinel-1 VV backscatter time series for a coordinate.

    Args:
        lat: Latitude (decimal degrees)
        lon: Longitude (decimal degrees)
        start_date: ISO date string e.g. '2022-01-01'
        end_date: ISO date string e.g. '2024-01-01'
        buffer_meters: Spatial buffer around the point (default 30m ≈ 1 GRD pixel)

    Returns:
        pd.DataFrame with columns: date (datetime), backscatter_db (float)

    Raises:
        ValueError: If no Sentinel-1 images found for the location/date range
    """
    initialize()

    point = ee.Geometry.Point([lon, lat])
    buffered = point.buffer(buffer_meters)

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
        mean = image.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=buffered,
            scale=10,
            maxPixels=1e9,
        )
        return ee.Feature(None, {
            "date": image.date().format("YYYY-MM-dd"),
            "backscatter_db": mean.get("VV"),
        })

    features = collection.map(extract_mean).getInfo()["features"]

    rows = []
    for f in features:
        props = f["properties"]
        if props.get("backscatter_db") is not None:
            rows.append({
                "date": datetime.strptime(props["date"], "%Y-%m-%d"),
                "backscatter_db": float(props["backscatter_db"]),
            })

    if not rows:
        raise ValueError(
            f"Sentinel-1 images were found but all had null VV values at ({lat}, {lon}). "
            "The location may be at the edge of a scene."
        )

    df = pd.DataFrame(rows).sort_values("date").reset_index(drop=True)
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
