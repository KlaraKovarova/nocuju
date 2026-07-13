-- NOC-93: three kinds of place verification (board decision NOC-92).
--
--  1. Internal admin verification -> places.admin_verified_at/_by/_note
--  2. User visits                 -> place_visits (+ minimal users table)
--  3. Community "info sedí"       -> place_reports.category enum + 'info-sedi'
--
-- Deploy to prod once before shipping NOC-93 code, either via:
--   mysql -h <host> -u <user> -p <db> < drizzle/2026-07-13_verification.sql
-- or POST /api/setup/migrate-verification (idempotent, checks
-- information_schema before ALTERing; auth mirrors /api/setup/bootstrap).
--
-- Note: the ALTER TABLE places statement below is NOT idempotent when run
-- via this file (MySQL 8.0 has no ADD COLUMN IF NOT EXISTS); the setup
-- endpoint is the safe re-runnable path.

ALTER TABLE `places`
  ADD COLUMN `admin_verified_at` TIMESTAMP NULL,
  ADD COLUMN `admin_verified_by` VARCHAR(128) NULL,
  ADD COLUMN `admin_verified_note` VARCHAR(500) NULL;

ALTER TABLE `place_reports`
  MODIFY COLUMN `category`
  ENUM('info-nesedi','nema-ho-tam','nebezpecne','jine','info-sedi') NOT NULL;

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(254) NOT NULL,
  `display_name` VARCHAR(128),
  `password_hash` VARCHAR(255),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(`id`),
  UNIQUE KEY `users_email_uq` (`email`)
);

CREATE TABLE IF NOT EXISTS `place_visits` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `place_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `visited_on` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(`id`),
  UNIQUE KEY `place_visits_place_user_day_uq` (`place_id`,`user_id`,`visited_on`),
  KEY `place_visits_place_idx` (`place_id`),
  KEY `place_visits_user_idx` (`user_id`)
);
