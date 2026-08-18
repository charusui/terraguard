# TerraGuard 🛰️

TerraGuard is an automated fraud detection tool designed for the DPWH (Department of Public Works and Highways) in the Philippines. It verifies infrastructure project progress using satellite imagery, independently of on-the-ground reports.

### How It Works
* **Queries Data**: Pulls **Sentinel-1 GRD** (radar backscatter) and **Sentinel-2** (optical) data via Google Earth Engine.
* **Detects Change**: Applies the **Ruptures Pelt** change-point detection algorithm to identify exactly when ground was broken.
* **Verifies Timelines**: Compares the detected physical start date against the official **Notice To Proceed (NTP)** contract date.
* **Flags Anomalies**: Automatically flags pre-existing structures, ghost projects, and timeline inconsistencies.

### 🧠 Core Algorithm
TerraGuard uses **`ruptures.Pelt`** (Penalized Exact Linear Time) with an RBF cost function. This was selected over Bayesian models because it is:
* **Fast**: Optimized for rapid execution across thousands of coordinates.
* **Resilient**: Highly effective at filtering out SAR speckle noise.
* **Precise**: Provides deterministic point estimates for scalable auditing.

## Tech Stack
* **Frontend**: Next.js (App Router), React, Recharts, Phosphor Icons
* **Backend**: Python, Google Earth Engine API, Pandas, Ruptures
* **Auth**: Token-based simple demo auth (`/api/auth`)

## Prerequisites

* Node.js (v18+)
* Python 3.11+
* Google Cloud Project with the Earth Engine API enabled
* A Google Cloud Service Account with the Earth Engine Resource Viewer role

## Local Setup

1. **Install Python dependencies:**
   \`\`\`bash
   cd backend
   pip install -r requirements.txt # (or install ee, pandas, ruptures, python-dotenv manually)
   \`\`\`

2. **Install Node dependencies:**
   \`\`\`bash
   cd terraguard
   npm install
   \`\`\`

3. **Configure Environment Variables:**
   Create a \`.env\` file in the **root** of the project (one level above `backend` and `terraguard`):
   \`\`\`env
   # Your GEE service account JSON key, minified to ONE single line
   GEE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...
   
   # Toggles the live GEE fetch (set to false to use mock data)
   NEXT_PUBLIC_USE_REAL_GEE=true
   
   # Demo authentication credentials
   DEMO_USERNAME=your_username
   DEMO_PASSWORD=your_password
   DEMO_AUTH_SECRET=your_secret_key
   \`\`\`

4. **Run the Next.js development server:**
   \`\`\`bash
   cd terraguard
   npm run dev
   \`\`\`



## Usage

* **Single Lookup**: Enter a project name, latitude, longitude, and claimed NTP date. TerraGuard will fetch the radar time series, analyze it, and output a verdict.
* **Batch Mode**: Upload a CSV of multiple projects to automatically audit all of them, generating a summary table and allowing for CSV export of the results.

### Verdict Types
* 🟢 **Consistent**: Construction was detected after the NTP date.
* 🟡 **No Change Detected**: No significant ground disruption detected (potential ghost project).
* 🔴 **Pre-Existing Structure Detected**: Construction was detected *before* the NTP date.
