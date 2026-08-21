import type { NextConfig } from "next";
import { config } from "dotenv";
import path from "path";

// Load the .env from the root directory so Next.js can see the auth credentials and GEE toggle
config({ path: path.resolve(process.cwd(), "..", ".env") });

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./backend/**/*'],
    // The icon route reads src/assets/logo.png via fs at request time
    // instead of an ES import, so trace it in explicitly for the
    // serverless bundle (nft can't follow the dynamic path.join call).
    '/icon': ['./src/assets/logo.png'],
  },
};

export default nextConfig;
