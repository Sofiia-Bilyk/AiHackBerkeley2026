import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Photo evidence is uploaded to Server Actions as base64 data URLs.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
