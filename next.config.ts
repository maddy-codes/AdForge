import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A leftover lockfile in $HOME made Next treat /Users/taran as the
  // workspace root, which corrupts .next and 500s the homepage.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
