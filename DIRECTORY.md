# Directory Structure

This document outlines the folder structure of the TerraGuard repository. The project has been modularized to separate the Next.js frontend application from the Python backend logic.

## Root Directory

```text
Satellite/
├── frontend/           # The Next.js frontend application and API routes
├── backend/            # The core Python analytics logic and testing
├── DIRECTORY.md        # This file
├── CONTRIBUTING.md     # Guidelines for contributing to the repository
└── README.md           # Project overview and setup instructions
```

---

## Frontend Module (`/frontend`)

This directory houses the entire Next.js application, including the UI components, pages, and Vercel serverless functions.

### Key Folders & Files

* **`src/app/`**: Contains the Next.js pages (e.g., `dashboard`, `guide`, `page.tsx`) and the global CSS (`globals.css`).
* **`src/components/`**: Reusable React components (e.g., `BatchMode.tsx`, `SingleLookup.tsx`, `SARChart.tsx`).
* **`src/lib/`**: Utility scripts and mock data (`mockData.ts`).
* **`api/`**: Contains Python serverless functions that act as the bridge between the frontend and the `backend` module.
  * `analyze.py`: Endpoint for triggering the radar change-point detection analysis.
  * `nl_query.py`: Endpoint for parsing natural language queries using Google Gemini.
  * `optical.py`: Endpoint for fetching and analyzing optical satellite imagery.
  * `requirements.txt`: Python dependencies required by the serverless functions.
* **`package.json`**: Node.js dependencies and run scripts.
* **`vercel.json`**: Configuration for deploying the application to Vercel (specifies that `api/analyze.py` is a serverless function).

---

## Backend Module (`/backend`)

This directory contains the core Python logic for satellite data retrieval, change-point detection algorithms, and image processing. It is designed to be imported and used by the serverless functions in the `frontend`.

### Key Folders & Files

* **`analyze.py`**: The main orchestration script that coordinates fetching data and running the detection algorithm.
* **`change_point.py`**: Contains the `ruptures` Pelt algorithm logic for detecting structural changes in radar backscatter data.
* **`sar_fetch.py`**: Handles querying Google Earth Engine for Sentinel-1 Synthetic Aperture Radar (SAR) data.
* **`optical_fetch.py`**: Handles querying Google Earth Engine for Sentinel-2 optical data.
* **`vision_annotate.py` / `validate_vision.py`**: Scripts for processing and annotating satellite imagery, often utilizing AI or basic image manipulation.
* **`tests/`**: Contains all unit and integration tests (e.g., `test_backend.py`, `test_landsat.py`). These scripts test the core logic independently of the frontend.
