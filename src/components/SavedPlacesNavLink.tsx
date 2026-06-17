"use client";

import Link from "next/link";

import { useSavedPlaces } from "./useSavedPlaces";

export function SavedPlacesNavLink() {
  const saves = useSavedPlaces();
  const count = saves.length;

  return (
    <Link
      href="/moje-mista"
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface)] hover:text-[var(--accent)]"
    >
      <span>Moje místa</span>
      {count > 0 && (
        <span
          aria-label={`${count} uložených míst`}
          className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-700 px-1.5 text-xs font-semibold text-white"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
