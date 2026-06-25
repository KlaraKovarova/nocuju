/**
 * Destructive cleanup: removes every place where `source_url` starts with the
 * `seed://` prefix (the fabricated dev-seed entries). Also clears the related
 * rows in `place_categories`, `place_amenities`, `place_images`, and any
 * `place_reports` for those places, so no orphan join rows remain.
 *
 * Triggered from `recover.yml -f action=db-cleanup-seed-places` only after the
 * board has confirmed the slug list in the issue thread. Requires the env var
 * NOC_DELETE_CONFIRMED=yes so this cannot be invoked by accident.
 */
import { eq, like } from "drizzle-orm";

import { db, sqlClient } from "../src/db/client";
import {
  placeAmenities,
  placeCategories,
  placeImages,
  placeReports,
  places,
} from "../src/db/schema";

async function main() {
  if (process.env.NOC_DELETE_CONFIRMED !== "yes") {
    console.error(
      "refused: set NOC_DELETE_CONFIRMED=yes to acknowledge this is a destructive op.",
    );
    process.exit(2);
  }

  const target = await db
    .select({
      id: places.id,
      slug: places.slug,
      source: places.source,
      sourceUrl: places.sourceUrl,
    })
    .from(places)
    .where(like(places.sourceUrl, "seed://%"));

  if (target.length === 0) {
    console.log("nothing to delete: 0 rows match source_url LIKE 'seed://%'");
    return;
  }

  console.log(`will delete ${target.length} rows:`);
  for (const row of target) {
    console.log(`  - id=${row.id} slug=${row.slug} sourceUrl=${row.sourceUrl}`);
  }

  for (const row of target) {
    const placeId = Number(row.id);
    await db.delete(placeImages).where(eq(placeImages.placeId, placeId));
    await db.delete(placeCategories).where(eq(placeCategories.placeId, placeId));
    await db.delete(placeAmenities).where(eq(placeAmenities.placeId, placeId));
    await db.delete(placeReports).where(eq(placeReports.placeId, placeId));
    await db.delete(places).where(eq(places.id, placeId));
  }

  console.log(`deleted ${target.length} rows successfully`);
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
