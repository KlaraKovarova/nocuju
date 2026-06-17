// One-shot, idempotent startup migration runner.
//
// Applies any raw SQL changes that must land before the rest of the app boots,
// because we don't run `db:push` in prod (it would rewrite the entire schema
// from the Drizzle baseline). Today this just creates `analytics_events` (NOC-52).
// Future migrations can extend the steps array; each step is responsible for
// being idempotent so a restart cannot double-apply it.

import { sqlClient } from "./client";

type RowDataPacket = Record<string, unknown>;

async function tableExists(db: string, name: string): Promise<boolean> {
  const [rows] = (await sqlClient.query(
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
    [db, name],
  )) as [RowDataPacket[], unknown];
  return Array.isArray(rows) && rows.length > 0;
}

async function indexExists(
  db: string,
  table: string,
  index: string,
): Promise<boolean> {
  const [rows] = (await sqlClient.query(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [db, table, index],
  )) as [RowDataPacket[], unknown];
  return Array.isArray(rows) && rows.length > 0;
}

async function currentDatabase(): Promise<string> {
  const [rows] = (await sqlClient.query(`SELECT DATABASE() AS db`)) as [
    Array<{ db: string | null }>,
    unknown,
  ];
  const name = rows?.[0]?.db;
  if (!name) {
    throw new Error("No active MySQL database selected for migrations");
  }
  return name;
}

async function ensureAnalyticsEvents(db: string): Promise<void> {
  await sqlClient.query(`CREATE TABLE IF NOT EXISTS \`analytics_events\` (
    \`id\` SERIAL AUTO_INCREMENT NOT NULL,
    \`path\` VARCHAR(512) NOT NULL,
    \`referrer_host\` VARCHAR(255),
    \`ua_class\` ENUM('mobile','desktop','bot','other') NOT NULL DEFAULT 'other',
    \`session_id\` VARCHAR(64) NOT NULL,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT (now()),
    CONSTRAINT \`analytics_events_id\` PRIMARY KEY (\`id\`)
  )`);

  const indexes: Array<[string, string]> = [
    ["analytics_events_created_idx", "(`created_at`)"],
    ["analytics_events_path_created_idx", "(`path`, `created_at`)"],
    ["analytics_events_session_idx", "(`session_id`, `created_at`)"],
  ];

  for (const [name, cols] of indexes) {
    if (await indexExists(db, "analytics_events", name)) continue;
    await sqlClient.query(
      `CREATE INDEX \`${name}\` ON \`analytics_events\` ${cols}`,
    );
  }
}

let appliedPromise: Promise<void> | null = null;

export function applyStartupMigrations(): Promise<void> {
  if (appliedPromise) return appliedPromise;
  appliedPromise = (async () => {
    if (!process.env.DATABASE_URL) {
      console.warn("[migrations] DATABASE_URL not set, skipping startup migrations");
      return;
    }
    const db = await currentDatabase();
    const had = await tableExists(db, "analytics_events");
    await ensureAnalyticsEvents(db);
    console.log(
      `[migrations] analytics_events ${had ? "already present" : "created"} in ${db}`,
    );
  })().catch((err) => {
    appliedPromise = null;
    console.error("[migrations] startup migration failed:", err);
    throw err;
  });
  return appliedPromise;
}
