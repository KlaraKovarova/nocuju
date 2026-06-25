/**
 * Read-only audit of the `places` table. Prints every row's id, slug, name,
 * source, and source_url so we can classify records by origin (verifiable vs
 * fabricated). Used from `recover.yml -f action=db-audit-places` over SSH on
 * the prod box.
 *
 * Tag legend printed in the right column:
 *   verifiable  — source is a crawler (boudy.info, viaczechia) with a real URL
 *                 OR source=manual with an http(s) URL pointing to an external
 *                 reference.
 *   fabricated  — source_url starts with `seed://` (placeholder seed entry).
 *   unsourced   — source=manual with NULL/empty source_url.
 */
import { asc } from "drizzle-orm";

import { db, sqlClient } from "../src/db/client";
import { places } from "../src/db/schema";

type Tag = "verifiable" | "fabricated" | "unsourced";

function classify(source: string, sourceUrl: string | null): Tag {
  if (sourceUrl && sourceUrl.startsWith("seed://")) return "fabricated";
  if (source === "boudy.info" || source === "viaczechia") return "verifiable";
  if (sourceUrl && /^https?:\/\//i.test(sourceUrl)) return "verifiable";
  return "unsourced";
}

async function main() {
  const rows = await db
    .select({
      id: places.id,
      slug: places.slug,
      name: places.name,
      source: places.source,
      sourceUrl: places.sourceUrl,
    })
    .from(places)
    .orderBy(asc(places.source), asc(places.slug));

  const counts: Record<Tag, number> = {
    verifiable: 0,
    fabricated: 0,
    unsourced: 0,
  };

  console.log("id\tslug\tsource\tsource_url\ttag\tname");
  for (const row of rows) {
    const tag = classify(row.source, row.sourceUrl);
    counts[tag] += 1;
    console.log(
      [
        row.id,
        row.slug,
        row.source,
        row.sourceUrl ?? "",
        tag,
        row.name,
      ].join("\t"),
    );
  }

  console.log("");
  console.log(
    `summary: total=${rows.length} verifiable=${counts.verifiable} fabricated=${counts.fabricated} unsourced=${counts.unsourced}`,
  );
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
