import ee
import os
from datetime import datetime, timedelta

def get_nearest_clear_image(lat: float, lon: float, target_date_str: str, direction: str = "before", buffer_meters: int = 500):
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
        display_date = target_date - timedelta(days=15)
    else:
        start = target_date
        end = target_date + timedelta(days=90)
        display_date = target_date + timedelta(days=15)
        
    start_str = start.strftime("%Y-%m-%d")
    end_str = end.strftime("%Y-%m-%d")

    point = ee.Geometry.Point([lon, lat])
    buffered = point.buffer(buffer_meters)

    collections = [
        {"name": "COPERNICUS/S2_SR_HARMONIZED", "bands": ['B4', 'B3', 'B2'], "is_s2": True, "cloud_filter": "CLOUDY_PIXEL_PERCENTAGE"}
    ]

    arr = None
    is_s2_match = False
    
    for coll in collections:
        collection = (
            ee.ImageCollection(coll["name"])
            .filterBounds(buffered)
            .filterDate(start_str, end_str)
            .filter(ee.Filter.lt(coll["cloud_filter"], 40))
        )
        
        first_img = collection.first()
        try:
            info = first_img.getInfo()
            if not info:
                continue
        except Exception:
            continue
            
        proj = first_img.select(coll["bands"][0]).projection()
        image = collection.median().setDefaultProjection(proj)
        
        try:
            arr = image.select(coll["bands"]).sampleRectangle(region=buffered).getInfo()
            is_s2_match = coll["is_s2"]
            bands = coll["bands"]
            break
        except Exception:
            continue

    if not arr:
        return None

    date_str = display_date.strftime("%Y-%m-%d")

    try:
        from PIL import Image
        import numpy as np
        import io
        
        b_red = np.array(arr['properties'][bands[0]])
        b_green = np.array(arr['properties'][bands[1]])
        b_blue = np.array(arr['properties'][bands[2]])
        
        rgb = np.dstack((b_red, b_green, b_blue))
        
        if is_s2_match:
            # Sentinel-2 SR is 0-10000
            rgb = np.clip(rgb / 3000.0, 0, 1) * 255
        else:
            # Landsat TOA is 0.0-1.0
            rgb = np.clip(rgb * 2.5, 0, 1) * 255
            
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
