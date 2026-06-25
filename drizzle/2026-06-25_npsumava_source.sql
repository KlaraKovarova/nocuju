-- Widens places.source enum with the new `npsumava` value used by NOC-88
-- (7 nouzových nocovišť NP Šumava). Idempotent: re-running the ALTER TABLE
-- with the same enum set is a no-op.
--
-- Run on prod once before deploying NOC-88 changes:
--   mysql -h <host> -u <user> -p <db> < drizzle/2026-06-25_npsumava_source.sql
-- /api/setup/seed-npsumava-nouzove also runs an equivalent ALTER as a guard
-- before inserting, so this file is the reviewable record of the schema delta.

ALTER TABLE `places`
  MODIFY COLUMN `source`
  ENUM('boudy.info','viaczechia','npsumava','manual') NOT NULL DEFAULT 'manual';
