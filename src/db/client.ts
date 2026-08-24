import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | undefined;

function databaseSsl() {
  if (process.env.NODE_ENV !== "production") return undefined;
  if (process.env.DATABASE_SSL === "disable") return undefined;
  if (process.env.DATABASE_SSL === "verify-full") {
    return {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_SSL_CA,
    };
  }
  return { rejectUnauthorized: true };
}

export function getDb(): pg.Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  pool = new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    maxLifetimeSeconds: 300,
    ssl: databaseSsl(),
  });

  return pool;
}

export async function closeDb(): Promise<void> {
  if (!pool) return;
  const current = pool;
  pool = undefined;
  await current.end();
}
