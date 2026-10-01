import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile higher up the tree must not change resolution.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
