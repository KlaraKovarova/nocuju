import { sqlClient } from "../src/db/client";
import { runSeed } from "../src/lib/db-seed";

runSeed()
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
