import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Service-agreement uploads are PDFs and can run to several MB.
      // 10 MB matches the cap in lib/uploads.ts.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;