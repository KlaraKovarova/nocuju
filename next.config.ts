import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/ubytovani", destination: "/objevit", permanent: false },
      {
        source: "/ubytovani/:slug",
        destination: "/misto/:slug",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
