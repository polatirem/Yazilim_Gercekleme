import type { NextConfig } from "next";
import path from "node:path";

// The browser always talks to the API through this same-origin proxy, so login works from
// localhost, 127.0.0.1 or a LAN address without CORS preflights or a second exposed port.
const apiTarget = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const config: NextConfig = {
  output: "standalone",
  // Lets a verification build run beside a live `next dev` without sharing .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  // The default 30 s proxy timeout cut off checks that generate and verify an answer with Gemini.
  experimental: { proxyTimeout: 120_000 },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiTarget}/:path*` }];
  },
};
export default config;
