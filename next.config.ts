import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "books.google.com",
      },
      {
        protocol: "https",
        hostname: "play-books.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.bukinist.al",
      },
      {
        protocol: "https",
        hostname: "CloudFront.bukinist.al",
      },
    ],
  },
};

export default nextConfig;
