import os
import io
import json
import base64
import requests
from PIL import Image, ImageDraw

def process_optical_image(url: str, enable_ai: bool = False) -> str:
    """
    Downloads an image from GEE url, draws a central anchor circle,
    optionally runs AI bounding boxes (disabled by default per safety policy),
    and returns a base64 encoded PNG.
    """
    resp = requests.get(url)
    if resp.status_code != 200:
        raise Exception(f"Failed to fetch image from GEE. Status: {resp.status_code}")
        
    img = Image.open(io.BytesIO(resp.content)).convert("RGB")
    
    # Draw anchor circle in the dead center
    draw = ImageDraw.Draw(img)
    cx, cy = img.width // 2, img.height // 2
    radius = 40
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline="red", width=3)
    
    # We skip Gemini call since it was proven unreliable on 10m/px crops in validation phase.
    
    # Save to base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    return f"data:image/png;base64,{img_str}"
