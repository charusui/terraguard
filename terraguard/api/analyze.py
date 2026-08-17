import json
import sys
import os

# Add the parent directory and backend directory to the path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root_dir)
sys.path.insert(0, os.path.join(root_dir, 'backend'))

from http.server import BaseHTTPRequestHandler

from backend.analyze import evaluate_verdict
from backend.sar_fetch import get_default_date_range, fetch_backscatter
from backend.change_point import detect_change_point


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
        claimed_date = body.get('claimed_date', '')
        project_name = body.get('project_name', 'Custom Lookup')

        if not lat or not lon or not claimed_date:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Missing lat, lon, or claimed_date"}).encode('utf-8'))
            return

        try:
            lat = float(lat)
            lon = float(lon)

            start_date, end_date = get_default_date_range(claimed_date)
            df = fetch_backscatter(lat, lon, start_date, end_date)
            cp_result = detect_change_point(df)

            det_date = cp_result.detected_date.strftime("%Y-%m-%d") if cp_result.detected_date else None

            verdict_info = evaluate_verdict(claimed_date, cp_result.detected_date, cp_result.confidence)

            # Build smoothed series list
            smoothed_list = []
            for _, row in cp_result.smoothed_series.iterrows():
                import math
                smoothed_val = row.get("smoothed_db")
                smoothed_list.append({
                    "date": row["date"].strftime("%Y-%m-%d"),
                    "backscatter_db": float(row["backscatter_db"]),
                    "smoothed_db": float(smoothed_val) if smoothed_val is not None and not math.isnan(float(smoothed_val)) else None,
                })

            out = {
                "project_name": project_name,
                "coordinates": {"lat": lat, "lon": lon},
                "claimed_date": claimed_date,
                "change_point": {
                    "detected_date": det_date,
                    "confidence": cp_result.confidence,
                    "days_difference": verdict_info.get("days_difference"),
                },
                "verdict": verdict_info["verdict"],
                "explanation": verdict_info["explanation"],
                "series": smoothed_list,
            }

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            resp = json.dumps(out).replace('NaN', 'null')
            self.wfile.write(resp.encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
