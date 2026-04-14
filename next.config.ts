import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/zones", destination: "/places", permanent: true },
      { source: "/zones/new", destination: "/places/new", permanent: true },
    ];
  },
};

export default nextConfig;
