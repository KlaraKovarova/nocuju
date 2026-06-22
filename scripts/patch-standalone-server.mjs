#!/usr/bin/env node
// Postbuild patch for Next.js's standalone `server.js`.
//
// Hostinger Business (CloudLinux NodeJS Selector + Phusion Passenger) ships
// the app via `output: 'standalone'` and runs `.next/standalone/server.js` as
// the entry. The stock template hard-casts `process.env.PORT` to int and falls
// back to 3000 on NaN — which silently breaks Phusion Passenger, where PORT
// can be a unix-socket path. Symptom: crash loop, empty stderr, banner shows
// `http://0.0.0.0:3000`, supervisor SIGTERMs after each spawn.
//
// This patch:
//   1. Lets PORT be either an integer OR a string (socket path).
//   2. Emits a one-line env diagnostic to stderr on startup (PORT, HOSTNAME,
//      PASSENGER_*, NODE_ENV) so future failures are not silent.
//
// Idempotent: skips if the marker comment is already present.

import { readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

const MARKER = "// NOC-64: patched-port-parse";

const candidates = [".next/standalone/server.js", "server.js"];

for (const rel of candidates) {
  const path = join(process.cwd(), rel);
  let st;
  try {
    st = await stat(path);
  } catch {
    continue;
  }
  if (!st.isFile()) continue;

  const original = await readFile(path, "utf8");
  if (original.includes(MARKER)) {
    console.log(`[patch-standalone-server] already patched: ${rel}`);
    continue;
  }

  const portLine = "const currentPort = parseInt(process.env.PORT, 10) || 3000";
  if (!original.includes(portLine)) {
    console.warn(
      `[patch-standalone-server] expected port-init line not found in ${rel}; skipping.`,
    );
    continue;
  }

  const replacement = `${MARKER}
const __noc64_rawPort = process.env.PORT;
const __noc64_parsedPort = parseInt(__noc64_rawPort, 10);
const currentPort = Number.isFinite(__noc64_parsedPort)
  ? __noc64_parsedPort
  : (__noc64_rawPort && __noc64_rawPort.length > 0 ? __noc64_rawPort : 3000);
process.stderr.write(
  "[noc startup] " + JSON.stringify({
    rawPort: __noc64_rawPort ?? null,
    boundTarget: currentPort,
    hostname: process.env.HOSTNAME ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
    passenger: Object.keys(process.env).filter(function (k) {
      return /^PASSENGER_/.test(k);
    }),
  }) + "\\n",
);`;

  const patched = original.replace(portLine, replacement);
  if (patched === original) {
    console.warn(
      `[patch-standalone-server] string-replace produced no change in ${rel}; aborting.`,
    );
    continue;
  }

  await writeFile(path, patched, "utf8");
  console.log(`[patch-standalone-server] patched ${rel}`);
}
