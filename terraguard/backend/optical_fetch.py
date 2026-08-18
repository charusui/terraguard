import ee
import os
from datetime import datetime, timedelta

def get_nearest_clear_image(lat: float, lon: float, target_date_str: str, direction: str = "before", buffer_meters: int = 300):
    """
    Fetches the nearest Sentinel-2 clear image url before or after a target date.
    """
    # Ensure ee is initialized with the service account key if available
    try:
        key_str = os.environ.get("GEE_SERVICE_ACCOUNT_KEY")
        if key_str:
            # We must use json.loads since the env var is a JSON string
            import json
            key_data = json.loads(key_str)
            credentials = ee.ServiceAccountCredentials(key_data.get('client_email', ''), key_data=key_str)
            ee.Initialize(credentials, project="satellite-hackathon-505804")
        else:
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
    
    try:
        # Fetch raw pixel array directly using getInfo()
        arr = image.select(['B4', 'B3', 'B2']).sampleRectangle(region=buffered).getInfo()
        
        # Convert to PNG bytes using Pillow & Numpy
        from PIL import Image
        import numpy as np
        import io
        
        b4 = np.array(arr['properties']['B4'])
        b3 = np.array(arr['properties']['B3'])
        b2 = np.array(arr['properties']['B2'])
        
        rgb = np.dstack((b4, b3, b2))
        rgb = np.clip(rgb / 3000.0, 0, 1) * 255
        rgb = rgb.astype(np.uint8)
        
        img = Image.fromarray(rgb).resize((512, 512), Image.Resampling.LANCZOS)
        
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        pixels = img_byte_arr.getvalue()
        
    except Exception as e:
        print("sampleRectangle error:", e)
        return None

    return {
        "pixels": pixels,
        "date": date_str
    }
