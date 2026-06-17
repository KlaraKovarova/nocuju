"use client";

import { useState } from "react";

import { useIsHydrated, useSavedSlugs } from "@/components/useSavedPlaces";

import { MapaView, type MapaMarker } from "./MapaView";

type Props = {
  center: [number, number];
  zoom: number;
  markers: MapaMarker[];
};

export function MapaWithSavedFilter({ center, zoom, markers }: Props) {
  const savedSlugs = useSavedSlugs();
  const [onlySaved, setOnlySaved] = useState(false);
  const hydrated = useIsHydrated();

  const visibleMarkers =
    hydrated && onlySaved
      ? markers.filter((m) => savedSlugs.has(m.slug))
      : markers;

  const savedCount = hydrated ? savedSlugs.size : 0;
  const visibleOnMap = hydrated && onlySaved ? visibleMarkers.length : null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm">
          <input
            type="checkbox"
            checked={onlySaved}
            onChange={(e) => setOnlySaved(e.target.checked)}
            disabled={!hydrated || savedCount === 0}
            className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>
            Jen uložená
            {savedCount > 0 && (
              <span className="ml-1.5 text-zinc-500">({savedCount})</span>
            )}
          </span>
        </label>
        {hydrated && onlySaved && visibleOnMap !== null && (
          <span className="text-sm text-zinc-600">
            {visibleOnMap === 0
              ? "Žádné z uložených míst neodpovídá ostatním filtrům."
              : `Zobrazeno ${visibleOnMap} z ${savedCount} uložených.`}
          </span>
        )}
      </div>
      <div className="h-[70vh] min-h-[480px] overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <MapaView center={center} zoom={zoom} markers={visibleMarkers} />
      </div>
    </>
  );
}
