import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const nextRaw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  const next = nextRaw && nextRaw.startsWith("/admin") ? nextRaw : "/admin/places";
  const hasError = sp.error === "1";

  if (await isAdminAuthenticated()) redirect(next);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Admin přihlášení</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Zadej sdílené heslo pro administraci.
        </p>
        <form
          method="POST"
          action="/api/admin/login"
          className="mt-6 space-y-4"
        >
          <input type="hidden" name="next" value={next} />
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700"
            >
              Heslo
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          {hasError && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              Nesprávné heslo.
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Přihlásit
          </button>
        </form>
      </div>
    </main>
  );
}
