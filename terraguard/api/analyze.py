import json
import sys
import os

# Add the parent directory and backend directory to the path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root_dir)
sys.path.insert(0, os.path.join(root_dir, 'backend'))

from http.server import BaseHTTPRequestHandler

from backend.analyze import analyze


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

            out = analyze(lat, lon, claimed_date, project_name)

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
