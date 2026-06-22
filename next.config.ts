import { execSync } from "node:child_process";
import type { NextConfig } from "next";

function resolveBuildCommitSha(): string {
  if (process.env.BUILD_COMMIT_SHA) return process.env.BUILD_COMMIT_SHA;
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

const nextConfig: NextConfig = {
  // Hostinger Business builds with output: 'standalone' regardless of what we
  // declare here — the deployed artifact tree on the box only contains the
  // standalone wrapper (.next/standalone/server.js) + .next/static + public.
  // Declaring it explicitly keeps local builds in sync with prod and lets the
  // postbuild patch (scripts/patch-standalone-server.mjs) find the generated
  // server.js to harden its PORT parsing for Phusion Passenger. See NOC-64.
  output: "standalone",
  env: {
    BUILD_COMMIT_SHA: resolveBuildCommitSha(),
    BUILD_TIME: new Date().toISOString(),
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "nocuju.cz" }],
        destination: "https://www.nocuju.cz/:path*",
        permanent: true,
      },
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
