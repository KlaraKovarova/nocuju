import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getSessionUser,
  MIN_PASSWORD_LENGTH,
  sanitizeNextPath,
} from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registrace",
  robots: { index: false },
};

function firstValue(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function RegistracePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const next = sanitizeNextPath(firstValue(sp.next), "/ucet");
  const error = firstValue(sp.error);
  const email = firstValue(sp.email) ?? "";

  if (await getSessionUser()) redirect(next);

  const loginQuery = new URLSearchParams();
  if (next !== "/ucet") loginQuery.set("next", next);
  const loginHref = `/ucet/prihlaseni${loginQuery.size ? `?${loginQuery}` : ""}`;

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Registrace</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Stačí e-mail a heslo. Po registraci můžeš u nocovišť ukládat
          „Byl(a) jsem tam“.
        </p>
        <form
          method="POST"
          action="/api/auth/register"
          className="mt-6 space-y-4"
        >
          <input type="hidden" name="next" value={next} />
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700"
            >
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={email}
              autoFocus
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700"
            >
              Heslo{" "}
              <span className="text-xs font-normal text-zinc-500">
                (aspoň {MIN_PASSWORD_LENGTH} znaků)
              </span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-zinc-700"
            >
              Jméno nebo přezdívka{" "}
              <span className="text-xs font-normal text-zinc-500">
                (volitelné)
              </span>
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="nickname"
              maxLength={128}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          {error && (
            <p
              role="alert"
              className="rounded bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Vytvořit účet
          </button>
        </form>
        <p className="mt-4 text-sm text-zinc-600">
          Už účet máš?{" "}
          <Link
            href={loginHref}
            className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            Přihlas se
          </Link>
        </p>
      </div>
    </main>
  );
}
