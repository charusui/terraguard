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
   ```bash
   cd terraguard/api
   pip install -r requirements.txt
   ```

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

   # Powers the AI assistant (natural-language lookup and result follow-ups)
   GEMINI_API_KEY=your_gemini_key

   # Lets the result assistant answer typed questions without turning on live
   # GEE. The two need different credentials — the assistant needs only
   # GEMINI_API_KEY — so this exists to switch the assistant on locally while
   # the analysis itself still runs on mock data. Setting NEXT_PUBLIC_USE_REAL_GEE
   # also enables it, which is why production needs no extra configuration.
   NEXT_PUBLIC_ENABLE_AI_ASSISTANT=true

   # TODO: not yet set. The AI assistant uses this to look up a project's
   # contract start date. Sign up at https://serpapi.com/ (free tier: 100
   # searches/month) and add the key here and in the Vercel project settings.
   # Until it is set the assistant cannot prefill a date and the UI asks the
   # operator to enter one by hand — nothing else is affected.
   SERPAPI_API_KEY=

   # Search results are labelled official / news / community by domain, and
   # the UI says so. Set this to false to drop community-edited sources
   # (wikis, forums, blog hosts) from results entirely.
   ALLOW_COMMUNITY_SOURCES=true
   \`\`\`

4. **Run the Next.js development server:**
   \`\`\`bash
   cd terraguard
   npm run dev
   \`\`\`

   **Which env file is read, and by what.** There are two runtimes here and they
   do not share environment variables:

   | Runtime | Serves | Reads env from |
   | :--- | :--- | :--- |
   | \`next dev\` | \`src/\` and \`src/app/api/\` (TypeScript routes) | root \`.env\`, loaded by \`next.config.ts\` |
   | \`vercel dev\` | the above **plus** \`frontend/api/*.py\` | \`frontend/.env.local\`, or \`vercel env pull\` |

   The Python routes read \`os.environ\` in their own process, so a key in the
   root \`.env\` never reaches them — and \`next dev\` does not serve them at all,
   so \`/api/nl_query\` and \`/api/optical\` 404 under \`npm run dev\`. To exercise
   those locally, put \`GEMINI_API_KEY\` in \`frontend/.env.local\` and run
   \`vercel dev\`. In production the keys live in the Vercel project's
   Environment Variables, which is the only place production reads.



## Usage

* **Single Lookup**: Enter a project name, latitude, longitude, and claimed NTP date. TerraGuard will fetch the radar time series, analyze it, and output a verdict.
* **Batch Mode**: Upload a CSV of multiple projects to automatically audit all of them, generating a summary table and allowing for CSV export of the results.

### Verdict Types
* 🟢 **Consistent**: Construction was detected after the NTP date.
* 🟡 **No Change Detected**: No significant ground disruption detected (potential ghost project).
* 🔴 **Pre-Existing Structure Detected**: Construction was detected *before* the NTP date.
