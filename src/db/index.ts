import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

async function connectPostgres(url: string): Promise<Db> {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  // prepare:false keeps it compatible with transaction-mode poolers (Neon, Supabase, PgBouncer).
  return drizzle(postgres(url, { prepare: false, max: 5 }), { schema });
}

// Zero-config local database: embedded Postgres persisted to .data/pglite.
async function connectPglite(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR || path.join(process.cwd(), ".data/pglite");
  mkdirSync(dir, { recursive: true });
  const db = drizzle(new PGlite(dir), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db;
}

const globalForDb = globalThis as unknown as { antabuseDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.antabuseDb) {
    const url = process.env.DATABASE_URL;
    if (!url && process.env.VERCEL) {
      throw new Error("DATABASE_URL is not set. Add a Postgres database in Vercel → Storage.");
    }
    globalForDb.antabuseDb = (url ? connectPostgres(url) : connectPglite()).catch((e) => {
      // Don't cache a failed connection; let the next request retry.
      globalForDb.antabuseDb = undefined;
      throw e;
    });
  }
  return globalForDb.antabuseDb;
}

export { schema };
