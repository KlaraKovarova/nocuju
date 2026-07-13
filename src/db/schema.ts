import {
  boolean,
  date,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const surfaceEnum = ["kamenna", "drevena", "hlinena", "trava", "mix"] as const;
export const sourceEnum = [
  "boudy.info",
  "viaczechia",
  "npsumava",
  "manual",
] as const;
export const reportCategoryEnum = [
  "info-nesedi",
  "nema-ho-tam",
  "nebezpecne",
  "jine",
  "info-sedi",
] as const;
export const reportStatusEnum = ["new", "triaged", "resolved", "dismissed"] as const;
export const uaClassEnum = ["mobile", "desktop", "bot", "other"] as const;

export const locations = mysqlTable("locations", {
  id: serial("id").primaryKey(),
  city: varchar("city", { length: 128 }).notNull(),
  region: varchar("region", { length: 128 }),
  country: varchar("country", { length: 2 }).notNull().default("CZ"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = mysqlTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
  },
  (table) => [uniqueIndex("categories_slug_uq").on(table.slug)],
);

export const amenities = mysqlTable(
  "amenities",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull(),
    label: varchar("label", { length: 128 }).notNull(),
  },
  (table) => [uniqueIndex("amenities_slug_uq").on(table.slug)],
);

export const places = mysqlTable(
  "places",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    locationId: int("location_id"),
    lat: varchar("lat", { length: 32 }).notNull(),
    lng: varchar("lng", { length: 32 }).notNull(),
    elevationM: int("elevation_m"),
    sleeps: int("sleeps"),
    surface: mysqlEnum("surface", surfaceEnum),
    hasWc: boolean("has_wc").notNull().default(false),
    isFree: boolean("is_free").notNull().default(true),
    source: mysqlEnum("source", sourceEnum).notNull().default("manual"),
    sourceUrl: varchar("source_url", { length: 512 }),
    adminVerifiedAt: timestamp("admin_verified_at"),
    adminVerifiedBy: varchar("admin_verified_by", { length: 128 }),
    adminVerifiedNote: varchar("admin_verified_note", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("places_slug_uq").on(table.slug),
    uniqueIndex("places_source_url_uq").on(table.source, table.sourceUrl),
  ],
);

export const placeCategories = mysqlTable(
  "place_categories",
  {
    placeId: int("place_id").notNull(),
    categoryId: int("category_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.placeId, table.categoryId] })],
);

export const placeAmenities = mysqlTable(
  "place_amenities",
  {
    placeId: int("place_id").notNull(),
    amenityId: int("amenity_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.placeId, table.amenityId] })],
);

export const placeImages = mysqlTable("place_images", {
  id: serial("id").primaryKey(),
  placeId: int("place_id").notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  alt: varchar("alt", { length: 256 }),
  sortOrder: int("sort_order").notNull().default(0),
});

export const placeReports = mysqlTable(
  "place_reports",
  {
    id: serial("id").primaryKey(),
    placeId: int("place_id").notNull(),
    category: mysqlEnum("category", reportCategoryEnum).notNull(),
    note: varchar("note", { length: 500 }),
    contactEmail: varchar("contact_email", { length: 254 }),
    sourceIpHash: varchar("source_ip_hash", { length: 64 }),
    status: mysqlEnum("status", reportStatusEnum).notNull().default("new"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("place_reports_place_idx").on(table.placeId),
    index("place_reports_status_idx").on(table.status),
    index("place_reports_ip_created_idx").on(table.sourceIpHash, table.createdAt),
  ],
);

// Minimal users schema for NOC-93 (visit-based verification). Auth UI and
// session handling land in a follow-up ticket; password_hash stays nullable
// until then so alternative auth (magic link, OAuth) is not ruled out.
export const users = mysqlTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 254 }).notNull(),
    displayName: varchar("display_name", { length: 128 }),
    passwordHash: varchar("password_hash", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_email_uq").on(table.email)],
);

export const placeVisits = mysqlTable(
  "place_visits",
  {
    id: serial("id").primaryKey(),
    placeId: int("place_id").notNull(),
    userId: int("user_id").notNull(),
    // mode "string" ("YYYY-MM-DD"): mysql2 serializes Date objects in the
    // server's local timezone, which can shift a UTC-midnight date by a day.
    visitedOn: date("visited_on", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("place_visits_place_user_day_uq").on(
      table.placeId,
      table.userId,
      table.visitedOn,
    ),
    index("place_visits_place_idx").on(table.placeId),
    index("place_visits_user_idx").on(table.userId),
  ],
);

export const analyticsEvents = mysqlTable(
  "analytics_events",
  {
    id: serial("id").primaryKey(),
    path: varchar("path", { length: 512 }).notNull(),
    referrerHost: varchar("referrer_host", { length: 255 }),
    uaClass: mysqlEnum("ua_class", uaClassEnum).notNull().default("other"),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("analytics_events_created_idx").on(table.createdAt),
    index("analytics_events_path_created_idx").on(table.path, table.createdAt),
    index("analytics_events_session_idx").on(table.sessionId, table.createdAt),
  ],
);

export const schema = {
  locations,
  categories,
  amenities,
  places,
  placeCategories,
  placeAmenities,
  placeImages,
  placeReports,
  users,
  placeVisits,
  analyticsEvents,
};

export type Place = typeof places.$inferSelect;
export type NewPlace = typeof places.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Amenity = typeof amenities.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type PlaceImage = typeof placeImages.$inferSelect;
export type PlaceReport = typeof placeReports.$inferSelect;
export type NewPlaceReport = typeof placeReports.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PlaceVisit = typeof placeVisits.$inferSelect;
export type NewPlaceVisit = typeof placeVisits.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
