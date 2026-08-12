import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a static bundle to `out/` so Render can serve it as a static site.
  output: "export",
  // The static export has no image optimization server.
  images: { unoptimized: true },
};

export default nextConfig;
