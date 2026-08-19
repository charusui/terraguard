# Repository Directory Map

This document maps out the entire structure of the TerraGuard repository, detailing the purpose of each directory and file.

---

## 📁 `frontend/`
The Next.js React web application.

### Config Files
- `package.json` - Node.js dependencies and scripts.
- `next.config.ts` - Next.js configuration.
- `vercel.json` - Vercel deployment settings (configures Python serverless functions).
- `tailwind.config.ts` / `postcss.config.mjs` - Styling configurations.
- `tsconfig.json` - TypeScript configuration.

### 📁 `frontend/public/`
Static assets served directly by Next.js.
- `hero.jpg` - Background hero image for the landing page.
- `globe.svg`, `file.svg`, `window.svg`, `next.svg`, `vercel.svg` - Various UI vector graphics and icons.

### 📁 `frontend/api/`
Vercel Serverless Functions written in Python. These act as the HTTP bridge between the frontend and the `backend/` logic.
- `analyze.py` - API endpoint that triggers the core SAR analysis.
- `nl_query.py` - API endpoint for handling natural language queries.
- `optical.py` - API endpoint for fetching optical imagery.
- `requirements.txt` - Python dependencies for these serverless routes.

### 📁 `frontend/src/`
The core frontend source code.

#### 📁 `frontend/src/app/`
Next.js App Router pages and layouts.
- `layout.tsx` - The root HTML layout wrapping all pages.
- `page.tsx` - The main landing page.
- `globals.css` - Global CSS and Tailwind directives.
- `favicon.ico` - The site favicon.
- `dashboard/page.tsx` - The main application dashboard interface.
- `guide/page.tsx` - The user guide and documentation page.
- `api/auth/route.ts` - Next.js API route handling user authentication.

#### 📁 `frontend/src/components/`
Reusable React components.
- `BatchMode.tsx` - Interface for running analysis on multiple coordinates at once.
- `GlobalNav.tsx` - The top navigation bar.
- `LoginScreen.tsx` - Authentication and login UI.
- `SARChart.tsx` - Data visualization component for plotting SAR backscatter time-series.
- `SingleLookup.tsx` - Interface for querying a single coordinate location.
- `ThemeToggle.tsx` - Button to toggle between light and dark mode.
- `VerdictBanner.tsx` - UI banner that displays the final detection results/verdict.

#### 📁 `frontend/src/lib/`
Utility functions and shared code.
- `mockData.ts` - Static mock data used for UI development and testing.

---

## 📁 `backend/`
The core Python analysis and data fetching logic. These files are completely isolated from the web framework and are imported by `frontend/api/`.

- `analyze.py` - The central orchestrator that coordinates data fetching and change point detection.
- `change_point.py` - The statistical algorithm for detecting structural changes in SAR backscatter data.
- `optical_fetch.py` - Connects to Google Earth Engine to retrieve Sentinel-2 optical imagery.
- `sar_fetch.py` - Connects to Google Earth Engine to retrieve Sentinel-1 SAR imagery.
- `vision_annotate.py` - Integrates with vision models to generate automated annotations of satellite data.

### 📁 `backend/tests/`
Python unit and integration tests.
- `test_*.py` - Various test files (e.g., `test_backend.py`) for verifying the analysis logic.

---

## 📁 `scripts/`
Utility scripts for repository maintenance.
- `check-conventions.sh` - Bash script that checks branches, commits, and code against the rules defined in `CONTRIBUTING.md`.

---

## Root Files
- `README.md` - The primary project introduction and setup guide.
- `CONTRIBUTING.md` - Developer guidelines, code style rules, and git workflows.
- `AGENTS.md` / `CLAUDE.md` - System instructions and context for AI coding assistants.
- `DIRECTORY.md` - This map.
- `.gitignore` - Lists files and directories that Git should ignore (like `node_modules/` and `__pycache__/`).
- `.env` / `.env.local` - Local environment variables (not tracked in Git).
