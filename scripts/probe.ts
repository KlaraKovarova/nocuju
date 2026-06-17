#!/usr/bin/env tsx
// Agent recovery CLI. Wraps the SSH-over-Actions recovery workflow and the
// in-app /api/health/* endpoints so an agent doesn't have to remember the
// individual `gh workflow run` / `curl` incantations.
//
// Subcommands:
//   probe                 — run smoke probes against production routes.
//   verify                — compare deployed SHA against origin/main, exits 1 on drift.
//   tail [--lines N]      — gh workflow run recover.yml action=tail-logs.
//   redeploy              — gh workflow run recover.yml action=pull-and-restart.
//   rollback <sha>        — gh workflow run recover.yml action=rollback.
//
// Usage:
//   npm run probe -- verify
//   npm run probe -- tail --lines 500
//   npm run probe -- rollback 7b6e91923
//
// Design doc: docs/deploy/agent-recovery.md

import { execSync } from "node:child_process";

const PROD_BASE_URL = process.env.NOC_PROD_BASE_URL ?? "https://www.nocuju.cz";
const PROBE_TIMEOUT_MS = 5_000;
const PROBE_ROUTES = ["/api/health", "/api/health/version", "/api/health/schema", "/"];

type Args = { command: string; positional: string[]; flags: Record<string, string> };

function parseArgs(argv: string[]): Args {
  const [command = "", ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i++) {
    const tok = rest[i];
    if (tok.startsWith("--")) {
      const key = tok.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = "true";
      }
    } else {
      positional.push(tok);
    }
  }
  return { command, positional, flags };
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function probe(): Promise<number> {
  let failed = 0;
  for (const route of PROBE_ROUTES) {
    const url = `${PROD_BASE_URL}${route}`;
    try {
      const res = await fetchWithTimeout(url, PROBE_TIMEOUT_MS);
      const tag = res.ok ? "OK " : "FAIL";
      console.log(`${tag} ${res.status} ${url}`);
      if (!res.ok) {
        failed += 1;
        const body = await res.text();
        console.log(`     body: ${body.slice(0, 200)}`);
      }
    } catch (err) {
      failed += 1;
      console.log(`FAIL --- ${url} (${(err as Error).message})`);
    }
  }
  return failed === 0 ? 0 : 1;
}

type VersionPayload = { commit?: string };

async function verify(): Promise<number> {
  let upstream = "";
  try {
    upstream = execSync("git rev-parse origin/main", { stdio: ["ignore", "pipe", "pipe"] })
      .toString()
      .trim();
  } catch {
    console.log("FAIL could not resolve origin/main locally (run `git fetch` first?)");
    return 1;
  }
  let deployed = "";
  try {
    const res = await fetchWithTimeout(`${PROD_BASE_URL}/api/health/version`, PROBE_TIMEOUT_MS);
    if (!res.ok) {
      console.log(`FAIL /api/health/version -> ${res.status}`);
      return 1;
    }
    const payload = (await res.json()) as VersionPayload;
    deployed = payload.commit ?? "unknown";
  } catch (err) {
    console.log(`FAIL fetch version: ${(err as Error).message}`);
    return 1;
  }
  console.log(`deployed=${deployed}`);
  console.log(`upstream=${upstream}`);
  if (deployed === upstream) {
    console.log("IN_SYNC");
    return 0;
  }
  console.log("DRIFT");
  return 1;
}

function runGh(args: string[]): void {
  console.log(`$ gh ${args.join(" ")}`);
  execSync(`gh ${args.join(" ")}`, { stdio: "inherit" });
}

function tail(flags: Record<string, string>): number {
  const lines = flags.lines ?? "200";
  runGh(["workflow", "run", "recover.yml", "-f", "action=tail-logs", "-f", `lines=${lines}`]);
  console.log("Dispatched. Watch with: gh run watch");
  return 0;
}

function redeploy(): number {
  runGh(["workflow", "run", "recover.yml", "-f", "action=pull-and-restart"]);
  console.log("Dispatched. Watch with: gh run watch");
  return 0;
}

function rollback(positional: string[]): number {
  const sha = positional[0];
  if (!sha) {
    console.log("Usage: rollback <sha>");
    return 1;
  }
  runGh(["workflow", "run", "recover.yml", "-f", "action=rollback", "-f", `target_sha=${sha}`]);
  console.log("Dispatched. Watch with: gh run watch");
  return 0;
}

async function main(): Promise<number> {
  const { command, positional, flags } = parseArgs(process.argv.slice(2));
  switch (command) {
    case "probe":
      return probe();
    case "verify":
      return verify();
    case "tail":
      return tail(flags);
    case "redeploy":
      return redeploy();
    case "rollback":
      return rollback(positional);
    default:
      console.log("Subcommands: probe | verify | tail [--lines N] | redeploy | rollback <sha>");
      console.log("See docs/deploy/agent-recovery.md");
      return command ? 1 : 0;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
