import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";

import { db } from "@/db/client";
import { locations, places } from "@/db/schema";

export const alt = "NOC — místo k přespání";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CATEGORY_PALETTE: Record<string, string> = {
  utulna: "linear-gradient(135deg, #0c2a22 0%, #134438 45%, #0a1a17 100%)",
  "nouzove-nocoviste":
    "linear-gradient(135deg, #3a1f08 0%, #6b3b14 45%, #1a0e05 100%)",
};

async function loadHero(slug: string) {
  const rows = await db
    .select({
      name: places.name,
      isFree: places.isFree,
      city: locations.city,
      region: locations.region,
    })
    .from(places)
    .leftJoin(locations, eq(places.locationId, locations.id))
    .where(eq(places.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadHero(slug);
  const name = data?.name ?? "NOC — kde přespat venku";
  const subtitle = data
    ? [data.city, data.region].filter(Boolean).join(", ")
    : "Veřejně sdílená databáze míst k přespání";
  const palette = CATEGORY_PALETTE.utulna;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: palette,
          color: "#fafaf7",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              background: "#fafaf7",
              color: "#141414",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              borderRadius: 14,
            }}
          >
            NOC
          </div>
          <div
            style={{
              fontSize: 20,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              opacity: 0.75,
            }}
          >
            kde přespat venku
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              maxWidth: 1040,
            }}
          >
            {name}
          </div>
          {subtitle && (
            <div style={{ fontSize: 32, opacity: 0.8 }}>{subtitle}</div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            opacity: 0.75,
          }}
        >
          <span>nocuju.cz</span>
          <span>
            {data?.isFree === false ? "Za poplatek" : "Volný přístup"}
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
