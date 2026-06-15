"use client";

import dynamic from "next/dynamic";

import type { MiniMapViewProps } from "./MiniMapView";

const MiniMapView = dynamic(() => import("./MiniMapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm text-zinc-500">
      Načítám mapu…
    </div>
  ),
});

export type { MiniMapMarker, MiniMapViewProps } from "./MiniMapView";

export function MiniMap(props: MiniMapViewProps) {
  return <MiniMapView {...props} />;
}
