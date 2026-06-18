CREATE TABLE `amenities` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	CONSTRAINT `amenities_id` PRIMARY KEY(`id`),
	CONSTRAINT `amenities_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`path` varchar(512) NOT NULL,
	`referrer_host` varchar(255),
	`ua_class` enum('mobile','desktop','bot','other') NOT NULL DEFAULT 'other',
	`session_id` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`city` varchar(128) NOT NULL,
	`region` varchar(128),
	`country` varchar(2) NOT NULL DEFAULT 'CZ',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `place_amenities` (
	`place_id` int NOT NULL,
	`amenity_id` int NOT NULL,
	CONSTRAINT `place_amenities_place_id_amenity_id_pk` PRIMARY KEY(`place_id`,`amenity_id`)
);
--> statement-breakpoint
CREATE TABLE `place_categories` (
	`place_id` int NOT NULL,
	`category_id` int NOT NULL,
	CONSTRAINT `place_categories_place_id_category_id_pk` PRIMARY KEY(`place_id`,`category_id`)
);
--> statement-breakpoint
CREATE TABLE `place_images` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`place_id` int NOT NULL,
	`url` varchar(1024) NOT NULL,
	`alt` varchar(256),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `place_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `place_reports` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`place_id` int NOT NULL,
	`category` enum('info-nesedi','nema-ho-tam','nebezpecne','jine') NOT NULL,
	`note` varchar(500),
	`contact_email` varchar(254),
	`source_ip_hash` varchar(64),
	`status` enum('new','triaged','resolved','dismissed') NOT NULL DEFAULT 'new',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `place_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `places` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`location_id` int,
	`lat` varchar(32) NOT NULL,
	`lng` varchar(32) NOT NULL,
	`elevation_m` int,
	`sleeps` int,
	`surface` enum('kamenna','drevena','hlinena','trava','mix'),
	`has_wc` boolean NOT NULL DEFAULT false,
	`is_free` boolean NOT NULL DEFAULT true,
	`source` enum('boudy.info','viaczechia','manual') NOT NULL DEFAULT 'manual',
	`source_url` varchar(512),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `places_id` PRIMARY KEY(`id`),
	CONSTRAINT `places_slug_uq` UNIQUE(`slug`),
	CONSTRAINT `places_source_url_uq` UNIQUE(`source`,`source_url`)
);
--> statement-breakpoint
CREATE INDEX `analytics_events_created_idx` ON `analytics_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `analytics_events_path_created_idx` ON `analytics_events` (`path`,`created_at`);--> statement-breakpoint
CREATE INDEX `analytics_events_session_idx` ON `analytics_events` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `place_reports_place_idx` ON `place_reports` (`place_id`);--> statement-breakpoint
CREATE INDEX `place_reports_status_idx` ON `place_reports` (`status`);--> statement-breakpoint
CREATE INDEX `place_reports_ip_created_idx` ON `place_reports` (`source_ip_hash`,`created_at`);