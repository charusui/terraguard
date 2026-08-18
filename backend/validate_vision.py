import os
import io
import json
import requests
import ee
from pathlib import Path
from dotenv import load_dotenv
from PIL import Image, ImageDraw

import google.generativeai as genai

# Setup environment
load_dotenv(Path(__file__).parent.parent / ".env")

ee.Initialize(project="satellite-hackathon-505804")

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY is not set.")
genai.configure(api_key=api_key)

# Manila flood control coordinates
lat = 14.5904492
lon = 120.9803621
buffer_meters = 300

print(f"Target coordinates: {lat}, {lon}")

# 1. Fetch clear Sentinel-2 image
point = ee.Geometry.Point([lon, lat])
buffered = point.buffer(buffer_meters)

print("Querying Sentinel-2...")
collection = (
    ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterBounds(buffered)
    .filterDate("2024-01-01", "2024-12-31")
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
)

image = collection.first()

if not image:
    print("No clear images found.")
    exit(1)

date_str = image.date().format("YYYY-MM-dd").getInfo()
print(f"Found clear image on: {date_str}")

url = image.getThumbURL({
    'region': buffered,
    'dimensions': 512,
    'format': 'png',
    'bands': ['B4', 'B3', 'B2'], # True color
    'min': 0,
    'max': 3000
})

print(f"Image URL: {url}")

# Download image
resp = requests.get(url)
img = Image.open(io.BytesIO(resp.content)).convert("RGB")

# 2. Draw circle instead of crosshair for stronger grounding
draw = ImageDraw.Draw(img)
cx, cy = img.width // 2, img.height // 2
radius = 40
draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline="red", width=3)

img_path = "marked_image.png"
img.save(img_path)
print(f"Saved marked image to {img_path}")

# 3. Call Gemini
print("Calling Gemini Vision...")
model = genai.GenerativeModel(
    "gemini-3.5-flash-lite",
    generation_config={
        "response_mime_type": "application/json",
        "response_schema": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "label": {"type": "STRING"},
                    "box_2d": {
                        "type": "ARRAY",
                        "items": {"type": "INTEGER"}
                    }
                }
            }
        }
    }
)

prompt = (
    "This satellite image shows a target site marked by a prominent red circle in the center. "
    "Look ONLY INSIDE the red circle. "
    "Return bounding boxes for any cleared earth, bare earth, or visible construction structures INSIDE the red circle. "
    "STRICTLY IGNORE anything outside the red circle, even if it looks like construction. "
    "Return the box_2d coordinates as [ymin, xmin, ymax, xmax] normalized to 0-1000, with a label for each."
)

gemini_img = Image.open(img_path)
response = model.generate_content([prompt, gemini_img])

print("Gemini response:")
print(response.text)

try:
    boxes = json.loads(response.text)
except json.JSONDecodeError:
    print("Failed to parse JSON.")
    exit(1)

# 4. Draw bounding boxes
draw = ImageDraw.Draw(img)
for item in boxes:
    label = item.get("label", "unknown")
    ymin, xmin, ymax, xmax = item.get("box_2d", [0,0,0,0])
    
    # Scale from 0-1000 to image dimensions
    w, h = img.width, img.height
    box_ymin = (ymin / 1000.0) * h
    box_xmin = (xmin / 1000.0) * w
    box_ymax = (ymax / 1000.0) * h
    box_xmax = (xmax / 1000.0) * w
    
    draw.rectangle([box_xmin, box_ymin, box_xmax, box_ymax], outline="cyan", width=2)
    draw.text((box_xmin, max(0, box_ymin - 12)), label, fill="cyan")

out_path = "annotated_image.png"
img.save(out_path)
print(f"Saved annotated image to {out_path}")
