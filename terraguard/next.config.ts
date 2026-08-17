import type { NextConfig } from "next";
import { config } from "dotenv";
import path from "path";

// Load the .env from the root directory so Next.js can see the auth credentials and GEE toggle
config({ path: path.resolve(process.cwd(), "..", ".env") });

const nextConfig: NextConfig = {
  // Note: 'output: export' removed — API routes (/api/analyze) require server mode.
  // Deploy to Vercel or run with `next start` locally.
  // For a static-only demo (mock data, no GEE), add back: output: 'export'
};

export default nextConfig;
