import { PGlite } from "@electric-sql/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import pg from "pg";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;
export interface Database { db: DB; close: () => Promise<void> }

// run from the server/ directory (npm scripts, Docker WORKDIR) or point MIGRATIONS_DIR elsewhere
const MIGRATIONS = path.resolve(process.cwd(), process.env.MIGRATIONS_DIR ?? "drizzle");

/**
 * DATABASE_URL=postgres://...  -> node-postgres pool (production / docker-compose)
 * DATABASE_URL empty            -> embedded PGlite (real Postgres compiled to WASM) in ./data
 * DATABASE_URL=memory://        -> in-memory PGlite (tests)
 */
export async function createDatabase(url: string): Promise<Database> {
  if (url.startsWith("postgres")) {
    const pool = new pg.Pool({ connectionString: url, max: 10 });
    const db = drizzlePg(pool, { schema });
    await migratePg(db, { migrationsFolder: MIGRATIONS });
    return { db: db as unknown as DB, close: () => pool.end() };
  }
  const client = url === "memory://" ? new PGlite() : new PGlite(url || "./data/pglite");
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS });
  return { db: db as unknown as DB, close: () => client.close() };
}
