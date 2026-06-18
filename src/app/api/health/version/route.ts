import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const commit = process.env.BUILD_COMMIT_SHA || "unknown";
  const buildTime = process.env.BUILD_TIME || null;

  return NextResponse.json({
    ok: true,
    commit,
    commitShort: commit === "unknown" ? "unknown" : commit.slice(0, 7),
    buildTime,
    nodeVersion: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
  });
}
