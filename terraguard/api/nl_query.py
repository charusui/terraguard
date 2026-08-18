import json
import os
import requests
from http.server import BaseHTTPRequestHandler

import google.generativeai as genai

# Setup Gemini API
api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

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

        action = body.get('action')

        if action == 'parse':
            self.handle_parse(body.get('text', ''))
        elif action == 'summarize':
            self.handle_summarize(body.get('verdict', {}))
        else:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Invalid action"}).encode('utf-8'))

    def handle_parse(self, text):
        if not text:
            self.send_json({"error": "No text provided"}, 400)
            return
            
        if not api_key:
            self.send_json({"error": "GEMINI_API_KEY not configured"}, 500)
            return

        # 1. Parse text with Gemini
        model = genai.GenerativeModel(
            "gemini-3.5-flash-lite",
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "OBJECT",
                    "properties": {
                        "location_name": {"type": "STRING"},
                        "start_date": {"type": "STRING"},
                        "end_date": {"type": "STRING"}
                    }
                }
            },
            system_instruction="Extract the location name and any date ranges from the user's query. Format dates as YYYY-MM-DD. If a field is not present or you are unsure, return null for that field. Do not guess."
        )

        try:
            response = model.generate_content(text)
            parsed = json.loads(response.text)
        except Exception as e:
            self.send_json({"error": f"Failed to parse query: {str(e)}"}, 500)
            return

        location_name = parsed.get("location_name")
        start_date = parsed.get("start_date")
        end_date = parsed.get("end_date")

        lat = None
        lon = None
        display_name = None

        # 2. Geocode if location is found
        if location_name:
            try:
                headers = {'User-Agent': 'TerraGuard-Hackathon-Bot/1.0'}
                geocode_url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(location_name)}&format=json&limit=1"
                geo_resp = requests.get(geocode_url, headers=headers, timeout=5)
                geo_data = geo_resp.json()
                if geo_data and len(geo_data) > 0:
                    match = geo_data[0]
                    lat = float(match.get('lat'))
                    lon = float(match.get('lon'))
                    display_name = match.get('display_name')
            except Exception as e:
                print("Geocoding error:", e)
                # Ignore geocoding failure, just return null lat/lon
                pass

        self.send_json({
            "parsed": {
                "location_name": location_name,
                "start_date": start_date,
                "end_date": end_date
            },
            "geocoded": {
                "lat": lat,
                "lon": lon,
                "display_name": display_name
            }
        })

    def handle_summarize(self, verdict_dict):
        if not api_key:
            self.send_json({"error": "GEMINI_API_KEY not configured"}, 500)
            return

        model = genai.GenerativeModel(
            "gemini-3.5-flash-lite",
            system_instruction="You are a friendly, educational assistant for TerraGuard. You will be given a JSON object containing the results of a satellite radar analysis. Your job is to translate these technical results into very simple, easy-to-understand terms for the general public. Explain what the 'verdict', 'confidence', and 'days_difference' actually mean in plain English. For example, explain that satellite backscatter measures physical changes on the ground (like concrete being poured or earth being moved). Be descriptive and helpful, adding useful context to the hardcoded verdict so the user understands HOW the satellite reached this conclusion, but maintain an objective tone and DO NOT legally accuse anyone of fraud."
        )

        try:
            prompt = f"Summarize this analysis result:\n{json.dumps(verdict_dict, indent=2)}"
            response = model.generate_content(prompt)
            self.send_json({"summary": response.text.strip()})
        except Exception as e:
            self.send_json({"error": f"Failed to summarize: {str(e)}"}, 500)

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
