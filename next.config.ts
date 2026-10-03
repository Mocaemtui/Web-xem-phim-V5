import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: typeof process !== "undefined" ? process.cwd() : undefined,
  },

  images: {
    unoptimized: true,
    loader: "custom",
    loaderFile: "./lib/imageLoader.ts",
    deviceSizes: [640, 828, 1200],
    imageSizes: [32, 64, 128],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ophim1.com",
      },
      {
        protocol: "https",
        hostname: "img.ophim.live",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "phimimg.com",
      },
      {
        protocol: "https",
        hostname: "phimapi.com",
      },
      {
        protocol: "https",
        hostname: "wsrv.nl",
      },
      {
        protocol: "https",
        hostname: "phim.nguonc.com",
      },
      {
        protocol: "https",
        hostname: "vidlink.pro",
      },
    ],
  },
};

export default nextConfig;
