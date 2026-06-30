import type { NextConfig } from "next";

// On GitHub Pages the project site is served from /<repo>. The workflow sets
// NEXT_PUBLIC_BASE_PATH to "/Repair-Dashboard"; locally it stays empty.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export", // fully static export for GitHub Pages
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
