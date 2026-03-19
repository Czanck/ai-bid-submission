import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger request bodies for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // pdfjs-dist optionally requires 'canvas' (a native module) for rendering.
  // We only use it for text extraction, so mark it as external to prevent bundling errors.
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
