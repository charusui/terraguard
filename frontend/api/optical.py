import json
import sys
import os
from datetime import datetime

# ---------------------------------------------------------------------------
# Path setup — must resolve on BOTH local dev AND Vercel's Lambda runtime.
# See the detailed comment in analyze.py for the full explanation.
# ---------------------------------------------------------------------------
_api_dir = os.path.dirname(os.path.abspath(__file__))
_project_dir = os.path.dirname(_api_dir)
_repo_root = os.path.dirname(_project_dir)

for _p in [
    _repo_root,
    os.path.join(_repo_root, 'backend'),
    _project_dir,
    os.path.join(_project_dir, 'backend'),
]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from http.server import BaseHTTPRequestHandler

try:
    from backend.optical_fetch import get_nearest_clear_image
    from backend.vision_annotate import process_optical_image
except ImportError:
    from optical_fetch import get_nearest_clear_image
    from vision_annotate import process_optical_image

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        auth_header = self.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip()
        secret = os.environ.get('DEMO_AUTH_SECRET')

        if secret and token != secret:
            self.send_response(401)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Unauthorized"}).encode('utf-8'))
            return

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            body = json.loads(post_data.decode('utf-8'))
        except Exception:
            body = {}

        lat = body.get('lat')
        lon = body.get('lon')
        detected_date_str = body.get('detected_date')

        if not lat or not lon or not detected_date_str:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Missing lat, lon, or detected_date"}).encode('utf-8'))
            return

        try:
            lat = float(lat)
            lon = float(lon)
            
            # Fetch before and after images
            before_data = get_nearest_clear_image(lat, lon, detected_date_str, "before")
            after_data = get_nearest_clear_image(lat, lon, detected_date_str, "after")
            
            det_date = datetime.strptime(detected_date_str, "%Y-%m-%d")

            response_data = {}
            
            if before_data and before_data.get("pixels"):
                b_date = datetime.strptime(before_data["date"], "%Y-%m-%d")
                b_offset = (b_date - det_date).days
                b_b64 = process_optical_image(before_data["pixels"])
                response_data["before"] = {
                    "image": b_b64,
                    "date": before_data["date"],
                    "offset_days": b_offset
                }
                
            if after_data and after_data.get("pixels"):
                a_date = datetime.strptime(after_data["date"], "%Y-%m-%d")
                a_offset = (a_date - det_date).days
                a_b64 = process_optical_image(after_data["pixels"])
                response_data["after"] = {
                    "image": a_b64,
                    "date": after_data["date"],
                    "offset_days": a_offset
                }

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
