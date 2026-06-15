import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;
let dbInstance: MySql2Database<Record<string, never>> | null = null;

function getPool(): mysql.Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  pool = mysql.createPool({
    uri: connectionString,
    connectionLimit: 1,
    ssl: process.env.DATABASE_SSL === "true" ? {} : undefined,
  });
  return pool;
}

function getDb(): MySql2Database<Record<string, never>> {
  if (dbInstance) return dbInstance;
  dbInstance = drizzle(getPool(), { mode: "default" });
  return dbInstance;
}

export const db = new Proxy({} as MySql2Database<Record<string, never>>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});

export const sqlClient = new Proxy({} as mysql.Pool, {
  get(_target, prop, receiver) {
    return Reflect.get(getPool() as object, prop, receiver);
  },
});
