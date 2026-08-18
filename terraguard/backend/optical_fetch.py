import ee
import os
from datetime import datetime, timedelta

def get_nearest_clear_image(lat: float, lon: float, target_date_str: str, direction: str = "before", buffer_meters: int = 300):
    """
    Fetches the nearest Sentinel-2 clear image url before or after a target date.
    """
    # Ensure ee is initialized. If sar_fetch already initialized it, this won't throw.
    try:
        ee.Initialize(project="satellite-hackathon-505804")
    except Exception:
        pass

    target_date = datetime.strptime(target_date_str, "%Y-%m-%d")
    
    if direction == "before":
        start = target_date - timedelta(days=90)
        end = target_date
    else:
        start = target_date
        end = target_date + timedelta(days=90)
        
    start_str = start.strftime("%Y-%m-%d")
    end_str = end.strftime("%Y-%m-%d")

    point = ee.Geometry.Point([lon, lat])
    buffered = point.buffer(buffer_meters)

    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(buffered)
        .filterDate(start_str, end_str)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
    )

    if direction == "before":
        # Sort descending to get the one closest to target_date
        collection = collection.sort("system:time_start", False)
    else:
        # Sort ascending to get the one closest to target_date
        collection = collection.sort("system:time_start", True)

    image = collection.first()
    
    # We must use getInfo() carefully
    try:
        info = image.getInfo()
        if not info:
            return None
    except Exception:
        return None

    date_str = image.date().format("YYYY-MM-dd").getInfo()
    
    url = image.getThumbURL({
        'region': buffered,
        'dimensions': 512,
        'format': 'png',
        'bands': ['B4', 'B3', 'B2'],
        'min': 0,
        'max': 3000
    })

    return {
        "url": url,
        "date": date_str
    }
