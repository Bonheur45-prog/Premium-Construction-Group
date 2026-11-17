import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // self-contained server bundle for the VPS deploy
  poweredByHeader: false,
  devIndicators: false,
};

export default nextConfig;
