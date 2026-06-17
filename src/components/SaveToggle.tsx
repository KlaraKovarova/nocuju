"use client";

import { toggleSavedPlace } from "@/lib/saved-places";

import { useIsSaved } from "./useSavedPlaces";

type Props = {
  slug: string;
  variant?: "card" | "detail";
  className?: string;
};

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.6}
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 17.25s-6.5-4.04-6.5-9a3.75 3.75 0 0 1 6.5-2.55A3.75 3.75 0 0 1 16.5 8.25c0 4.96-6.5 9-6.5 9Z"
      />
    </svg>
  );
}

export function SaveToggle({ slug, variant = "card", className }: Props) {
  const saved = useIsSaved(slug);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    toggleSavedPlace(slug);
  };

  if (variant === "detail") {
    const base =
      "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2";
    const tone = saved
      ? "bg-emerald-700 text-white hover:bg-emerald-800"
      : "border border-emerald-700 text-emerald-700 hover:bg-emerald-50";
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={saved}
        aria-label={saved ? "Odebrat z uložených" : "Uložit místo"}
        className={[base, tone, className].filter(Boolean).join(" ")}
      >
        <HeartIcon filled={saved} />
        <span>{saved ? "Uloženo" : "Uložit místo"}</span>
      </button>
    );
  }

  const base =
    "inline-flex items-center justify-center rounded-full bg-white/95 p-1.5 text-zinc-700 shadow-sm ring-1 ring-black/5 transition hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500";
  const tone = saved ? "text-emerald-700" : "";
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? "Odebrat z uložených" : "Uložit místo"}
      title={saved ? "Odebrat z uložených" : "Uložit místo"}
      className={[base, tone, className].filter(Boolean).join(" ")}
    >
      <HeartIcon filled={saved} />
    </button>
  );
}
