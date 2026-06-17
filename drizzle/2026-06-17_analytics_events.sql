-- Adds the analytics_events table used by the proxy's recordPageview() (NOC-38).
-- This is also applied automatically on server start by
-- src/db/apply-startup-migrations.ts; keeping the raw file in the repo so the
-- exact DDL is reviewable without diffing a full drizzle baseline (per NOC-52).

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
