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
    ];
  },
};

export default nextConfig;
