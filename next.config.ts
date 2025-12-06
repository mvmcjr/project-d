import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export", // Removed to allow API routes
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
};

export default nextConfig;
