"use client";

import { useSyncExternalStore } from "react";

import {
  SAVED_PLACES_EVENT,
  readSavedPlaces,
  type SavedPlace,
} from "@/lib/saved-places";

let cachedSnapshot: SavedPlace[] = [];
let initialized = false;
const listeners = new Set<() => void>();

function refresh(): void {
  cachedSnapshot = readSavedPlaces();
  initialized = true;
  for (const l of listeners) l();
}

function handleExternal(): void {
  refresh();
}

function subscribe(callback: () => void): () => void {
  if (!initialized) refresh();
  listeners.add(callback);
  if (listeners.size === 1) {
    window.addEventListener(SAVED_PLACES_EVENT, handleExternal);
    window.addEventListener("storage", handleExternal);
  }
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0) {
      window.removeEventListener(SAVED_PLACES_EVENT, handleExternal);
      window.removeEventListener("storage", handleExternal);
    }
  };
}

function getSnapshot(): SavedPlace[] {
  return cachedSnapshot;
}

const EMPTY: SavedPlace[] = [];
function getServerSnapshot(): SavedPlace[] {
  return EMPTY;
}

export function useSavedPlaces(): SavedPlace[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsSaved(slug: string): boolean {
  const saves = useSavedPlaces();
  return saves.some((s) => s.slug === slug);
}

export function useSavedSlugs(): Set<string> {
  const saves = useSavedPlaces();
  return new Set(saves.map((s) => s.slug));
}

const emptySubscribe = () => () => {};
const trueSnapshot = () => true;
const falseSnapshot = () => false;

export function useIsHydrated(): boolean {
  return useSyncExternalStore(emptySubscribe, trueSnapshot, falseSnapshot);
}
