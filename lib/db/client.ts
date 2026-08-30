import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { SCHEMA_SQL } from "@/lib/db/schema-sql";
import * as schema from "@/lib/db/schema";

type AppDb =
  | ReturnType<typeof drizzlePglite<typeof schema>>
  | ReturnType<typeof drizzlePostgres<typeof schema>>;

type GlobalDb = {
  db?: AppDb;
  ready?: Promise<AppDb>;
};

const globalForDb = globalThis as unknown as GlobalDb;

function dataDir(): string {
  const dir = path.join(process.cwd(), ".data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

async function applySchema(exec: (sql: string) => Promise<unknown>): Promise<void> {
  await exec(SCHEMA_SQL);
}

async function createDb(): Promise<AppDb> {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    const client = postgres(databaseUrl, { max: 4, prepare: false });
    const db = drizzlePostgres(client, { schema });
    await applySchema((sql) => client.unsafe(sql));
    return db;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const client = new PGlite(path.join(dataDir(), "pglite"));
  await client.waitReady;
  const db = drizzlePglite(client, { schema });
  await applySchema((sql) => client.exec(sql));
  return db;
}

export async function getDb(): Promise<AppDb> {
  if (globalForDb.db) return globalForDb.db;
  if (!globalForDb.ready) {
    globalForDb.ready = createDb().then((db) => {
      globalForDb.db = db;
      return db;
    });
  }
  return globalForDb.ready;
}
