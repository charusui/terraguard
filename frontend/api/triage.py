import json
import os
import sys

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

# Deferred import across the frontend/backend seam — see the note in analyze.py.
compute_flags = None
rank = None
_import_error = None

try:
    from triage.contract_features import compute_flags
    from triage.rank import rank
except Exception as exc:  # noqa: BLE001 — reported to the caller, not raised at import
    _import_error = str(exc)


def _to_float(value):
    if value in (None, ""):
        return None
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def expected_area(row: dict):
    """
    Contracted footprint in m², where the contract says enough to compute one.

    Uses an explicit `expected_area_m2` column if present, otherwise length x
    width. Returns None rather than guessing a width — a made-up denominator
    would turn every long project into a scope shortfall.
    """
    explicit = _to_float(row.get("expected_area_m2"))
    if explicit:
        return explicit

    length = _to_float(row.get("length_m"))
    width = _to_float(row.get("width_m"))
    if length and width:
        return length * width
    return None


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        auth_header = self.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip()
        secret = os.environ.get('DEMO_AUTH_SECRET')

        if secret and token != secret:
            self.send_json({"error": "Unauthorized"}, 401)
            return

        if rank is None or compute_flags is None:
            self.send_json({"error": f"Triage unavailable: {_import_error}"}, 500)
            return

        content_length = int(self.headers.get('Content-Length', 0))
        try:
            body = json.loads(self.rfile.read(content_length).decode('utf-8'))
        except Exception:
            body = {}

        rows = body.get('rows') or []
        analyses = body.get('analyses') or []

        if not analyses:
            self.send_json({"error": "No analyses supplied"}, 400)
            return

        # Contract columns are optional. Where a row is missing, fall back to
        # what the analysis itself knows, so the coordinate checks still run on
        # a bare name/lat/lon CSV.
        if len(rows) != len(analyses):
            rows = [
                {
                    "name": a.get("project_name"),
                    "lat": (a.get("coordinates") or {}).get("lat"),
                    "lon": (a.get("coordinates") or {}).get("lon"),
                }
                for a in analyses
            ]

        try:
            flags = compute_flags(rows)
            areas = [expected_area(row) for row in rows]
            ranked = rank(analyses, flags, areas)
        except Exception as exc:  # noqa: BLE001
            self.send_json({"error": f"Ranking failed: {exc}"}, 500)
            return

        high = sum(1 for r in ranked if r["priority"] == "high")
        medium = sum(1 for r in ranked if r["priority"] == "medium")

        self.send_json({
            "ranked": ranked,
            "summary": {
                "total": len(ranked),
                "high": high,
                "medium": medium,
                "low": len(ranked) - high - medium,
                "flagged": high + medium,
            },
        })

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
