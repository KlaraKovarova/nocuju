-- Adds the analytics_events table used by /admin/analytics (NOC-38).
-- Run on prod once before deploying NOC-38 changes:
--   mysql -h <host> -u <user> -p <db> < drizzle/2026-06-17_analytics_events.sql
-- The repo otherwise uses `npm run db:push` for schema sync; this file is a
-- one-shot fallback so the launch-day change is reviewable without diffing
-- a full drizzle baseline.

CREATE TABLE IF NOT EXISTS `analytics_events` (
  `id` SERIAL AUTO_INCREMENT NOT NULL,
  `path` VARCHAR(512) NOT NULL,
  `referrer_host` VARCHAR(255),
  `ua_class` ENUM('mobile','desktop','bot','other') NOT NULL DEFAULT 'other',
  `session_id` VARCHAR(64) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT (now()),
  CONSTRAINT `analytics_events_id` PRIMARY KEY (`id`)
);

CREATE INDEX `analytics_events_created_idx` ON `analytics_events` (`created_at`);
CREATE INDEX `analytics_events_path_created_idx` ON `analytics_events` (`path`, `created_at`);
CREATE INDEX `analytics_events_session_idx` ON `analytics_events` (`session_id`, `created_at`);
