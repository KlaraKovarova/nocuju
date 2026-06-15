"use client";

import dynamic from "next/dynamic";
import type { MapMarker } from "./places-map";

const PlacesMap = dynamic(
  () => import("./places-map").then((m) => m.PlacesMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse bg-[color:var(--border)]/40" />
    ),
  },
);

export function PlacesMapLoader({ markers }: { markers: MapMarker[] }) {
  return <PlacesMap markers={markers} />;
}
