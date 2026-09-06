import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep static-generation concurrency predictable on constrained builders.
    cpus: 2,
  },
};

export default nextConfig;
