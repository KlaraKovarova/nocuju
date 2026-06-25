/**
 * CLI wrapper for the NP Šumava nouzová nocoviště seed (NOC-88).
 * Library lives in src/lib/seed-npsumava-nouzove.ts (also used by
 * /api/setup/seed-npsumava-nouzove for prod).
 *
 * Local usage:
 *   npm run seed:npsumava-nouzove
 */
import { sqlClient } from "../src/db/client";
import { runNpsumavaNouzoveSeed } from "../src/lib/seed-npsumava-nouzove";

async function main() {
  const r = await runNpsumavaNouzoveSeed();
  console.log("=== npsumava nouzové seed ===");
  console.log(`source listing:    ${r.sourceListUrl}`);
  console.log(`created:           ${r.created}`);
  console.log(`updated:           ${r.updated}`);
  console.log(`npsumava rows DB:  ${r.npsumavaRowsInDb}`);
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
