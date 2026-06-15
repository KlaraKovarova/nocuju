"use client";

import dynamic from "next/dynamic";

const DetailMiniMap = dynamic(
  () => import("./detail-mini-map").then((m) => m.DetailMiniMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse bg-[color:var(--border)]/40" />
    ),
  },
);

export function DetailMiniMapLoader(props: {
  lat: number;
  lng: number;
  name: string;
}) {
  return <DetailMiniMap {...props} />;
}
