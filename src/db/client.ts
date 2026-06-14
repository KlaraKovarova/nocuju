import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = mysql.createPool({
  uri: connectionString,
  connectionLimit: 1,
  ssl: process.env.DATABASE_SSL === "true" ? {} : undefined,
});

export const db = drizzle(pool, { mode: "default" });
export const sqlClient = pool;
