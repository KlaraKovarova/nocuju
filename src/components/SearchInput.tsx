"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Props = {
  initialValue: string;
  basePath: "/objevit" | "/mapa";
  placeholder?: string;
  debounceMs?: number;
};

export function SearchInput({
  initialValue,
  basePath,
  placeholder = "Hledat podle názvu, popisu nebo oblasti…",
  debounceMs = 300,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const [syncedInitial, setSyncedInitial] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  if (initialValue !== syncedInitial) {
    setSyncedInitial(initialValue);
    setValue(initialValue);
  }

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === syncedInitial.trim()) return;

    const handle = window.setTimeout(() => {
      const sp = new URLSearchParams(searchParams?.toString() ?? "");
      if (trimmed) sp.set("q", trimmed);
      else sp.delete("q");
      sp.delete("stranka");
      const qs = sp.toString();
      const target = qs ? `${basePath}?${qs}` : basePath;
      startTransition(() => {
        router.replace(target, { scroll: false });
      });
    }, debounceMs);

    return () => window.clearTimeout(handle);
  }, [value, syncedInitial, debounceMs, basePath, router, searchParams]);

  const onPath = pathname === basePath;

  return (
    <div className="relative">
      <input
        type="search"
        inputMode="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Hledat místa"
        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 pr-10 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
      >
        {isPending && onPath ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-600" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 3.473 9.752l3.388 3.388a.75.75 0 1 0 1.06-1.06l-3.388-3.388A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
