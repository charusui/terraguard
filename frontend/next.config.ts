import type { NextConfig } from "next";
import { config } from "dotenv";
import path from "path";

// Load the .env from the root directory so Next.js can see the auth credentials and GEE toggle
config({ path: path.resolve(process.cwd(), "..", ".env") });

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./backend/**/*'],
  },
};

export default nextConfig;
