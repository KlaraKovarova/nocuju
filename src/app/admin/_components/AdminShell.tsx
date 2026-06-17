import Link from "next/link";

import { logoutAction } from "../login/actions";

export function AdminShell({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/admin/places"
              className="text-base font-semibold text-zinc-900"
            >
              NOC · admin
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              <Link
                href="/admin/places"
                className="text-zinc-600 hover:text-zinc-900"
              >
                Místa
              </Link>
              <Link
                href="/admin/reports"
                className="text-zinc-600 hover:text-zinc-900"
              >
                Hlášení
              </Link>
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-600 hover:text-zinc-900"
              >
                Veřejný web ↗
              </Link>
            </nav>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Odhlásit
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
          {actions ? (
            <div className="flex items-center gap-2">{actions}</div>
          ) : null}
        </div>
        {children}
      </main>
    </div>
  );
}
