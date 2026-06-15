import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ErrorWithCode = Error & {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
  cause?: unknown;
};

function describeError(error: unknown): {
  message: string;
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
  cause?: string;
  hint?: string;
} {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }
  const e = error as ErrorWithCode;
  const causeMessage =
    e.cause instanceof Error
      ? e.cause.message
      : e.cause !== undefined
        ? String(e.cause)
        : undefined;

  let hint: string | undefined;
  const code = e.code ?? (e.cause instanceof Error ? (e.cause as ErrorWithCode).code : undefined);
  if (code === "ENOTFOUND") {
    hint =
      "DNS lookup for the MySQL host failed. Check DATABASE_URL host spelling or whether hPanel's Remote MySQL hostname matches.";
  } else if (code === "ETIMEDOUT" || code === "ECONNREFUSED") {
    hint =
      "TCP connection to MySQL was refused or timed out. Most likely Remote MySQL is not enabled in hPanel → Databases → Remote MySQL, or the Node.js app's IP is not in the allow-list.";
  } else if (code === "ER_ACCESS_DENIED_ERROR") {
    hint =
      "MySQL rejected the credentials. Verify the password in DATABASE_URL and that the user has GRANT on the database.";
  } else if (code === "ER_DBACCESS_DENIED_ERROR") {
    hint =
      "MySQL user exists but has no privileges on this database. Re-grant in hPanel → MySQL Databases.";
  } else if (code === "ER_BAD_DB_ERROR") {
    hint = "Database name in DATABASE_URL does not exist on this MySQL host.";
  }

  return {
    message: e.message,
    code,
    errno: e.errno,
    sqlState: e.sqlState,
    sqlMessage: e.sqlMessage,
    cause: causeMessage,
    hint,
  };
}

export async function GET() {
  const hasUrl = Boolean(process.env.DATABASE_URL);
  const sslEnabled = process.env.DATABASE_SSL === "true";

  try {
    const result = (await db.execute(sql`select 1 as ok`)) as unknown as [
      Array<{ ok: number }>,
      unknown,
    ];
    const rows = result[0];
    const ok = Array.isArray(rows) && rows[0]?.ok === 1;
    return NextResponse.json({
      ok: true,
      db: ok ? "reachable" : "unreachable",
      config: { hasDatabaseUrl: hasUrl, ssl: sslEnabled },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        db: "unreachable",
        config: { hasDatabaseUrl: hasUrl, ssl: sslEnabled },
        error: describeError(error),
      },
      { status: 503 },
    );
  }
}
