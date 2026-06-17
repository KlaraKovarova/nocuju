"use client";

import Link from "next/link";

import { useIsHydrated, useSavedPlaces } from "@/components/useSavedPlaces";

import { PlaceCard, type PlaceCardData } from "../objevit/_components/PlaceCard";

type Props = {
  allCards: PlaceCardData[];
};

export function MojeMistaList({ allCards }: Props) {
  const saves = useSavedPlaces();
  const hydrated = useIsHydrated();

  if (!hydrated) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center text-sm text-zinc-500"
      >
        Načítám uložená místa…
      </div>
    );
  }

  if (saves.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-16 text-center">
        <p className="text-lg font-medium text-zinc-700">
          Zatím tu nic není.
        </p>
        <p className="mt-2 max-w-sm text-sm text-zinc-500">
          Klikni na srdíčko u kteréhokoli místa a uloží se sem.
          Hodí se na plánování delších tras.
        </p>
        <Link
          href="/objevit"
          className="mt-5 rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Procházet místa
        </Link>
      </div>
    );
  }

  const savedAtBySlug = new Map(saves.map((s) => [s.slug, s.savedAt]));
  const cards = allCards
    .filter((c) => savedAtBySlug.has(c.place.slug))
    .sort(
      (a, b) =>
        (savedAtBySlug.get(b.place.slug) ?? 0) -
        (savedAtBySlug.get(a.place.slug) ?? 0),
    );

  const missing = saves.length - cards.length;

  return (
    <>
      <p className="mb-4 text-sm text-zinc-600">
        {cards.length === 1
          ? "1 uložené místo."
          : `${cards.length} ${cards.length >= 2 && cards.length <= 4 ? "uložená místa" : "uložených míst"}.`}{" "}
        Pro odebrání klikni na srdíčko v rohu karty.
      </p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <PlaceCard key={card.place.id} data={card} />
        ))}
      </div>
      {missing > 0 && (
        <p className="mt-6 text-sm text-zinc-500">
          {missing === 1
            ? "Jedno uložené místo už nejde najít (nejspíš bylo odstraněno)."
            : `${missing} uložená místa už nejdou najít (nejspíš byla odstraněna).`}
        </p>
      )}
    </>
  );
}
