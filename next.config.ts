import type { NextConfig } from "next";

const repo = "MountingPositionVisualizer"; // e.g. "mounting-rectangles"
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: isProd ? `/${repo}` : undefined,
  assetPrefix: isProd ? `/${repo}/` : undefined,
  images: { unoptimized: true }, // if you ever use next/image
};

export default nextConfig;