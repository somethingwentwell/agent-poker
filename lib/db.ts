import { Pool, type PoolClient } from "pg";

const DEFAULT_DATABASE_URL =
  "postgres://agentpoker:agentpoker@localhost:5432/agentpoker";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
}

export function isEphemeralStorage(): boolean {
  return process.env.STORAGE_EPHEMERAL === "1";
}

export function getPool(): Pool {
  if (pool) return pool;

  pool = new Pool({
    connectionString: getDatabaseUrl(),
    max: 10,
  });

  return pool;
}

async function ensureSchema(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rooms_updated ON rooms(updated_at DESC);
  `);
}

export async function initDb(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const client = await getPool().connect();
      try {
        await ensureSchema(client);
      } finally {
        client.release();
      }
    })();
  }
  await schemaReady;
}

/** Close the pool (tests / before restore). */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    schemaReady = null;
  }
}
