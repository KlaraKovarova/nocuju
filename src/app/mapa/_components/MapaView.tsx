"use client";

import dynamic from "next/dynamic";

import type { MapaCanvasProps } from "./MapaCanvas";

const MapaCanvas = dynamic(() => import("./MapaCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm text-zinc-500">
      Načítám mapu…
    </div>
  ),
});

export type { MapaMarker } from "./MapaCanvas";

export function MapaView(props: MapaCanvasProps) {
  return <MapaCanvas {...props} />;
}
