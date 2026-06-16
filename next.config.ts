import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "nocuju.cz" }],
        destination: "https://www.nocuju.cz/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
