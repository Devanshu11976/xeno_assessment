import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  devIndicators: false,
  // Allow browser subagents on 127.0.0.1
  allowedDevOrigins: ['127.0.0.1'],
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
