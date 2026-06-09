#!/usr/bin/env node
/**
 * Export or restore the Postgres room database.
 *
 *   npm run db:dump
 *   npm run db:dump -- -o backup.json
 *   npm run db:restore -- backup.json
 *   npm run db:restore -- backup.json --replace
 */
import fs from "fs";
import pg from "pg";

const { Pool } = pg;

const FORMAT = "agentpoker-dump";
const LEGACY_FORMAT = "agentpoker-sqlite-dump";
const VERSION = 2;

const DEFAULT_DATABASE_URL =
  "postgres://agentpoker:agentpoker@localhost:5432/agentpoker";
const DEFAULT_REDIS_URL = "redis://localhost:6379";

function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
}

function redisUrl() {
  return process.env.REDIS_URL?.trim() || DEFAULT_REDIS_URL;
}

async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rooms_updated ON rooms(updated_at DESC);
  `);
}

async function exportDb() {
  const pool = new Pool({ connectionString: databaseUrl() });
  try {
    await ensureSchema(pool);
    const result = await pool.query(
      "SELECT data FROM rooms ORDER BY updated_at DESC",
    );
    const rooms = result.rows.map((row) => row.data);
    return {
      format: FORMAT,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      databaseUrl: databaseUrl(),
      redisUrl: redisUrl(),
      ephemeral: false,
      roomCount: rooms.length,
      rooms,
    };
  } finally {
    await pool.end();
  }
}

async function importDb(dump, replace) {
  const pool = new Pool({ connectionString: databaseUrl() });
  try {
    await ensureSchema(pool);
    if (replace) {
      await pool.query("DELETE FROM rooms");
    }

    let restored = 0;
    let skipped = 0;
    const now = Date.now();

    for (const room of dump.rooms) {
      if (!room?.code || !Array.isArray(room.players)) {
        skipped++;
        continue;
      }
      await pool.query(
        `INSERT INTO rooms (code, data, created_at, updated_at)
         VALUES ($1, $2::jsonb, $3, $4)
         ON CONFLICT (code) DO UPDATE SET
           data = EXCLUDED.data,
           updated_at = EXCLUDED.updated_at`,
        [room.code, JSON.stringify(room), room.createdAt ?? now, now],
      );
      restored++;
    }

    return { restored, skipped };
  } finally {
    await pool.end();
  }
}

function usage() {
  console.log(`Usage:
  node scripts/db-dump.mjs [-o file.json]
  node scripts/db-dump.mjs --restore file.json [--replace]

Env:
  DATABASE_URL (default ${DEFAULT_DATABASE_URL})
  REDIS_URL    (default ${DEFAULT_REDIS_URL})`);
}

const args = process.argv.slice(2);

if (args[0] === "--restore") {
  const file = args[1];
  const replace = args.includes("--replace");
  if (!file) {
    usage();
    process.exit(1);
  }
  const dump = JSON.parse(fs.readFileSync(file, "utf8"));
  if (
    dump.format &&
    dump.format !== FORMAT &&
    dump.format !== LEGACY_FORMAT
  ) {
    console.error(`Unsupported format: ${dump.format}`);
    process.exit(1);
  }
  const result = await importDb(dump, replace);
  console.log(
    `Restored ${result.restored} room(s) to Postgres (skipped ${result.skipped})`,
  );
  process.exit(0);
}

const outIdx = args.indexOf("-o");
const outFile = outIdx >= 0 ? args[outIdx + 1] : null;
const dump = await exportDb();
const json = JSON.stringify(dump, null, 2);

if (outFile) {
  fs.writeFileSync(outFile, json);
  console.log(`Wrote ${dump.roomCount} room(s) to ${outFile}`);
} else {
  process.stdout.write(json);
}
