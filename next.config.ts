import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    // The Memory page was renamed to Tribal Knowledge; keep old links working.
    return [{ source: "/memory", destination: "/tribal-knowledge", permanent: true }];
  },
};

export default nextConfig;
