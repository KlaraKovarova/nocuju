import { and, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { placeReports, places, placeVisits } from "@/db/schema";

// Verification summary for a place card (NOC-93, board decision NOC-92).
// Three kinds of verification, shown transparently:
//  - adminVerified: internal check by the NOC team — the only one rendered
//    as "Ověřeno" in the UI
//  - visitsCount: "byl/a jsem tady" visits from registered users
//  - infoSediCount: positive community reports (category `info-sedi`,
//    dismissed ones excluded)
export type AdminVerification = {
  at: Date;
  by: string | null;
  note: string | null;
};

export type PlaceVerificationSummary = {
  placeId: number;
  adminVerified: AdminVerification | null;
  visitsCount: number;
  infoSediCount: number;
};

export async function getPlaceVerificationSummaries(
  placeIds: number[],
): Promise<Map<number, PlaceVerificationSummary>> {
  const result = new Map<number, PlaceVerificationSummary>();
  if (placeIds.length === 0) return result;

  const [adminRows, visitRows, reportRows] = await Promise.all([
    db
      .select({
        id: places.id,
        at: places.adminVerifiedAt,
        by: places.adminVerifiedBy,
        note: places.adminVerifiedNote,
      })
      .from(places)
      .where(inArray(places.id, placeIds)),
    db
      .select({
        placeId: placeVisits.placeId,
        n: sql<number>`count(*)`,
      })
      .from(placeVisits)
      .where(inArray(placeVisits.placeId, placeIds))
      .groupBy(placeVisits.placeId),
    db
      .select({
        placeId: placeReports.placeId,
        n: sql<number>`count(*)`,
      })
      .from(placeReports)
      .where(
        and(
          inArray(placeReports.placeId, placeIds),
          eq(placeReports.category, "info-sedi"),
          ne(placeReports.status, "dismissed"),
        ),
      )
      .groupBy(placeReports.placeId),
  ]);

  for (const row of adminRows) {
    result.set(row.id, {
      placeId: row.id,
      adminVerified: row.at
        ? { at: row.at, by: row.by, note: row.note }
        : null,
      visitsCount: 0,
      infoSediCount: 0,
    });
  }
  for (const row of visitRows) {
    const entry = result.get(row.placeId);
    if (entry) entry.visitsCount = Number(row.n);
  }
  for (const row of reportRows) {
    const entry = result.get(row.placeId);
    if (entry) entry.infoSediCount = Number(row.n);
  }
  return result;
}

export async function getPlaceVerificationSummary(
  placeId: number,
): Promise<PlaceVerificationSummary | null> {
  const summaries = await getPlaceVerificationSummaries([placeId]);
  return summaries.get(placeId) ?? null;
}
