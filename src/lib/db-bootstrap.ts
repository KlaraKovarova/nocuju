import { sql } from "drizzle-orm";

import { db } from "@/db/client";

const EXPECTED_TABLES = [
  "locations",
  "categories",
  "amenities",
  "places",
  "place_categories",
  "place_amenities",
  "place_images",
] as const;

const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS \`amenities\` (
    \`id\` SERIAL AUTO_INCREMENT NOT NULL,
    \`slug\` VARCHAR(64) NOT NULL,
    \`label\` VARCHAR(128) NOT NULL,
    CONSTRAINT \`amenities_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`amenities_slug_uq\` UNIQUE(\`slug\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`analytics_events\` (
    \`id\` SERIAL AUTO_INCREMENT NOT NULL,
    \`path\` VARCHAR(512) NOT NULL,
    \`referrer_host\` VARCHAR(255),
    \`ua_class\` ENUM('mobile','desktop','bot','other') NOT NULL DEFAULT 'other',
    \`session_id\` VARCHAR(64) NOT NULL,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT (now()),
    CONSTRAINT \`analytics_events_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`categories\` (
    \`id\` SERIAL AUTO_INCREMENT NOT NULL,
    \`slug\` VARCHAR(64) NOT NULL,
    \`name\` VARCHAR(128) NOT NULL,
    CONSTRAINT \`categories_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`categories_slug_uq\` UNIQUE(\`slug\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`locations\` (
    \`id\` SERIAL AUTO_INCREMENT NOT NULL,
    \`city\` VARCHAR(128) NOT NULL,
    \`region\` VARCHAR(128),
    \`country\` VARCHAR(2) NOT NULL DEFAULT 'CZ',
    \`created_at\` TIMESTAMP NOT NULL DEFAULT (now()),
    CONSTRAINT \`locations_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`place_amenities\` (
    \`place_id\` INT NOT NULL,
    \`amenity_id\` INT NOT NULL,
    CONSTRAINT \`place_amenities_place_id_amenity_id_pk\` PRIMARY KEY(\`place_id\`,\`amenity_id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`place_categories\` (
    \`place_id\` INT NOT NULL,
    \`category_id\` INT NOT NULL,
    CONSTRAINT \`place_categories_place_id_category_id_pk\` PRIMARY KEY(\`place_id\`,\`category_id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`place_images\` (
    \`id\` SERIAL AUTO_INCREMENT NOT NULL,
    \`place_id\` INT NOT NULL,
    \`url\` VARCHAR(1024) NOT NULL,
    \`alt\` VARCHAR(256),
    \`sort_order\` INT NOT NULL DEFAULT 0,
    CONSTRAINT \`place_images_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`place_reports\` (
    \`id\` SERIAL AUTO_INCREMENT NOT NULL,
    \`place_id\` INT NOT NULL,
    \`category\` ENUM('info-nesedi','nema-ho-tam','nebezpecne','jine') NOT NULL,
    \`note\` VARCHAR(500),
    \`contact_email\` VARCHAR(254),
    \`source_ip_hash\` VARCHAR(64),
    \`status\` ENUM('new','triaged','resolved','dismissed') NOT NULL DEFAULT 'new',
    \`created_at\` TIMESTAMP NOT NULL DEFAULT (now()),
    \`updated_at\` TIMESTAMP NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`place_reports_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`places\` (
    \`id\` SERIAL AUTO_INCREMENT NOT NULL,
    \`slug\` VARCHAR(160) NOT NULL,
    \`name\` VARCHAR(200) NOT NULL,
    \`description\` TEXT,
    \`location_id\` INT,
    \`lat\` VARCHAR(32) NOT NULL,
    \`lng\` VARCHAR(32) NOT NULL,
    \`elevation_m\` INT,
    \`sleeps\` INT,
    \`surface\` ENUM('kamenna','drevena','hlinena','trava','mix'),
    \`has_wc\` BOOLEAN NOT NULL DEFAULT false,
    \`is_free\` BOOLEAN NOT NULL DEFAULT true,
    \`source\` ENUM('boudy.info','viaczechia','manual') NOT NULL DEFAULT 'manual',
    \`source_url\` VARCHAR(512),
    \`created_at\` TIMESTAMP NOT NULL DEFAULT (now()),
    \`updated_at\` TIMESTAMP NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`places_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`places_slug_uq\` UNIQUE(\`slug\`),
    CONSTRAINT \`places_source_url_uq\` UNIQUE(\`source\`,\`source_url\`)
  )`,
];

const INDEX_STATEMENTS: Array<{ name: string; table: string; ddl: string }> = [
  {
    name: "analytics_events_created_idx",
    table: "analytics_events",
    ddl: "CREATE INDEX `analytics_events_created_idx` ON `analytics_events` (`created_at`)",
  },
  {
    name: "analytics_events_path_created_idx",
    table: "analytics_events",
    ddl: "CREATE INDEX `analytics_events_path_created_idx` ON `analytics_events` (`path`,`created_at`)",
  },
  {
    name: "analytics_events_session_idx",
    table: "analytics_events",
    ddl: "CREATE INDEX `analytics_events_session_idx` ON `analytics_events` (`session_id`,`created_at`)",
  },
  {
    name: "place_reports_place_idx",
    table: "place_reports",
    ddl: "CREATE INDEX `place_reports_place_idx` ON `place_reports` (`place_id`)",
  },
  {
    name: "place_reports_status_idx",
    table: "place_reports",
    ddl: "CREATE INDEX `place_reports_status_idx` ON `place_reports` (`status`)",
  },
  {
    name: "place_reports_ip_created_idx",
    table: "place_reports",
    ddl: "CREATE INDEX `place_reports_ip_created_idx` ON `place_reports` (`source_ip_hash`,`created_at`)",
  },
];

type TableReport = { name: string; existed: boolean };

export type BootstrapResult = {
  schemaApplied: TableReport[];
  indexesEnsured: string[];
  seeded: boolean;
};

async function tableExists(name: string): Promise<boolean> {
  const result = (await db.execute(
    sql`select count(*) as n from information_schema.tables where table_schema = database() and table_name = ${name}`,
  )) as unknown as [Array<{ n: number | string }>, unknown];
  return Number(result[0]?.[0]?.n ?? 0) > 0;
}

async function indexExists(table: string, indexName: string): Promise<boolean> {
  const result = (await db.execute(
    sql`select count(*) as n from information_schema.statistics where table_schema = database() and table_name = ${table} and index_name = ${indexName}`,
  )) as unknown as [Array<{ n: number | string }>, unknown];
  return Number(result[0]?.[0]?.n ?? 0) > 0;
}

export async function applySchema(): Promise<TableReport[]> {
  const reports: TableReport[] = [];
  for (const tableName of [
    ...EXPECTED_TABLES,
    "analytics_events",
    "place_reports",
  ]) {
    const existed = await tableExists(tableName);
    reports.push({ name: tableName, existed });
  }
  for (const ddl of SCHEMA_STATEMENTS) {
    await db.execute(sql.raw(ddl));
  }
  return reports;
}

export async function ensureIndexes(): Promise<string[]> {
  const created: string[] = [];
  for (const { name, table, ddl } of INDEX_STATEMENTS) {
    if (await indexExists(table, name)) continue;
    await db.execute(sql.raw(ddl));
    created.push(name);
  }
  return created;
}

export async function isSchemaEmpty(): Promise<boolean> {
  for (const t of EXPECTED_TABLES) {
    if (await tableExists(t)) return false;
  }
  return true;
}

export async function runBootstrap(options: {
  seed: boolean;
}): Promise<BootstrapResult> {
  const schemaApplied = await applySchema();
  const indexesEnsured = await ensureIndexes();
  let seeded = false;
  if (options.seed) {
    const { runSeed } = await import("./db-seed");
    await runSeed();
    seeded = true;
  }
  return { schemaApplied, indexesEnsured, seeded };
}
