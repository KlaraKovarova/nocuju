import { sql } from "drizzle-orm";

import { db } from "@/db/client";

// Idempotent application of drizzle/2026-07-13_verification.sql (NOC-93).
// MySQL 8.0 has no ADD COLUMN IF NOT EXISTS, so each ALTER is guarded by an
// information_schema check; safe to re-run any number of times.

export type VerificationMigrationStatus = {
  adminColumnsPresent: boolean;
  infoSediInEnum: boolean;
  usersTablePresent: boolean;
  placeVisitsTablePresent: boolean;
};

export type VerificationMigrationResult = {
  before: VerificationMigrationStatus;
  applied: string[];
};

async function columnExists(table: string, column: string): Promise<boolean> {
  const result = (await db.execute(
    sql`select count(*) as n from information_schema.columns where table_schema = database() and table_name = ${table} and column_name = ${column}`,
  )) as unknown as [Array<{ n: number | string }>, unknown];
  return Number(result[0]?.[0]?.n ?? 0) > 0;
}

async function tableExists(name: string): Promise<boolean> {
  const result = (await db.execute(
    sql`select count(*) as n from information_schema.tables where table_schema = database() and table_name = ${name}`,
  )) as unknown as [Array<{ n: number | string }>, unknown];
  return Number(result[0]?.[0]?.n ?? 0) > 0;
}

async function reportCategoryHasInfoSedi(): Promise<boolean> {
  const result = (await db.execute(
    sql`select column_type as t from information_schema.columns where table_schema = database() and table_name = 'place_reports' and column_name = 'category'`,
  )) as unknown as [Array<{ t: string }>, unknown];
  const columnType = result[0]?.[0]?.t ?? "";
  return columnType.includes("info-sedi");
}

export async function verificationMigrationStatus(): Promise<VerificationMigrationStatus> {
  return {
    adminColumnsPresent: await columnExists("places", "admin_verified_at"),
    infoSediInEnum: await reportCategoryHasInfoSedi(),
    usersTablePresent: await tableExists("users"),
    placeVisitsTablePresent: await tableExists("place_visits"),
  };
}

export async function runVerificationMigration(): Promise<VerificationMigrationResult> {
  const before = await verificationMigrationStatus();
  const applied: string[] = [];

  if (!before.adminColumnsPresent) {
    await db.execute(
      sql.raw(
        "ALTER TABLE `places` ADD COLUMN `admin_verified_at` TIMESTAMP NULL, ADD COLUMN `admin_verified_by` VARCHAR(128) NULL, ADD COLUMN `admin_verified_note` VARCHAR(500) NULL",
      ),
    );
    applied.push("places.admin_verified_*");
  }

  if (!before.infoSediInEnum) {
    await db.execute(
      sql.raw(
        "ALTER TABLE `place_reports` MODIFY COLUMN `category` ENUM('info-nesedi','nema-ho-tam','nebezpecne','jine','info-sedi') NOT NULL",
      ),
    );
    applied.push("place_reports.category+info-sedi");
  }

  if (!before.usersTablePresent) {
    await db.execute(
      sql.raw(
        "CREATE TABLE IF NOT EXISTS `users` (" +
          "`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT," +
          "`email` VARCHAR(254) NOT NULL," +
          "`display_name` VARCHAR(128)," +
          "`password_hash` VARCHAR(255)," +
          "`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP," +
          "PRIMARY KEY(`id`)," +
          "UNIQUE KEY `users_email_uq` (`email`))",
      ),
    );
    applied.push("users");
  }

  if (!before.placeVisitsTablePresent) {
    await db.execute(
      sql.raw(
        "CREATE TABLE IF NOT EXISTS `place_visits` (" +
          "`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT," +
          "`place_id` INT NOT NULL," +
          "`user_id` INT NOT NULL," +
          "`visited_on` DATE NOT NULL," +
          "`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP," +
          "PRIMARY KEY(`id`)," +
          "UNIQUE KEY `place_visits_place_user_day_uq` (`place_id`,`user_id`,`visited_on`)," +
          "KEY `place_visits_place_idx` (`place_id`)," +
          "KEY `place_visits_user_idx` (`user_id`))",
      ),
    );
    applied.push("place_visits");
  }

  return { before, applied };
}
