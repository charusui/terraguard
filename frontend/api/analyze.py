import json
import sys
import os

# ---------------------------------------------------------------------------
# Path setup — must resolve on BOTH local dev AND Vercel's Lambda runtime.
#
# Local:  __file__ = <repo>/frontend/api/analyze.py
#         project_dir  = <repo>/frontend
#         repo_root    = <repo>           ← backend/ lives here
#
# Vercel: __file__ = /var/task/api/analyze.py
#         project_dir  = /var/task
#         repo_root    = /var             ← backend/ is NOT here
#         includeFiles copies backend/ into /var/task/backend/
#
# We add both candidate directories so Python finds the modules either way.
# ---------------------------------------------------------------------------
_api_dir = os.path.dirname(os.path.abspath(__file__))
_project_dir = os.path.dirname(_api_dir)
_repo_root = os.path.dirname(_project_dir)

for _p in [
    _repo_root,                            # local: <repo>
    os.path.join(_repo_root, 'backend'),   # local: <repo>/backend
    _project_dir,                          # Vercel: /var/task
    os.path.join(_project_dir, 'backend'), # Vercel: /var/task/backend
]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from http.server import BaseHTTPRequestHandler

# Import the analysis code across the frontend/backend seam. This is deferred
# rather than fatal: if backend/ failed to make it into the bundle, we still want
# a JSON error body so the UI can show the real reason instead of a bare 500.
#
# Note: no `from analyze import ...` fallback here — this module is itself named
# `analyze`, so that import resolves to this file and dies with a confusing
# partially-initialized-module error.
analyze = None
_import_error = None
try:
    from backend.analyze import analyze
except Exception as _e:  # noqa: BLE001 — surfaced to the client below
    _import_error = (
        f"{type(_e).__name__}: {_e}. The backend/ package is not importable from "
        f"the serverless function (sys.path={sys.path!r})."
    )


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

        if analyze is None:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": _import_error}).encode('utf-8'))
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
