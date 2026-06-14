import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(connectionString, {
  max: 1,
  ssl: process.env.DATABASE_SSL === "require" ? "require" : undefined,
});

export const db = drizzle(client);
export const sqlClient = client;
