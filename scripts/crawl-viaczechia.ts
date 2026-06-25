/**
 * CLI wrapper for the viaczechia.cz/utulny crawler. Library lives in
 * src/lib/crawl-viaczechia.ts (also used by /api/setup/crawl-viaczechia).
 *
 * Local usage:
 *   npm run crawl:viaczechia
 *
 * The same library powers the prod path. On Hostinger, DATABASE_URL is only
 * exposed to the running Node app (not SSH), so prod imports go through the
 * HTTP route, not this script.
 */
import { sqlClient } from "../src/db/client";
import { runViaczechiaCrawl } from "../src/lib/crawl-viaczechia";

async function main() {
  console.log("[fetch] https://viaczechia.cz/utulny/");
  const r = await runViaczechiaCrawl();

  console.log(`[parse] ${r.candidates} unique útulny extracted`);
  console.log("");
  console.log("=== crawl summary ===");
  console.log(`candidates:           ${r.candidates}`);
  console.log(`created:              ${r.created}`);
  console.log(`updated:              ${r.updated}`);
  console.log(`skipped cross-source: ${r.skippedCrossSource}`);
  console.log(`viaczechia rows in DB: ${r.viaczechiaRowsInDb}`);
  if (r.crossSourceWarnings.length > 0) {
    console.log("");
    console.log("cross-source warnings:");
    for (const w of r.crossSourceWarnings) console.log(`  ${w}`);
  }
  if (r.errors.length > 0) {
    console.log("");
    console.log("errors:");
    for (const e of r.errors) console.log(`  ${e}`);
  }
}

main()
  .then(async () => {
    await sqlClient.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    try {
      await sqlClient.end();
    } catch {}
    process.exit(1);
  });
