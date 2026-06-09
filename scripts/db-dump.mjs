#!/usr/bin/env node
/**
 * Export or restore the SQLite room database.
 *
 *   npm run db:dump
 *   npm run db:dump -- -o backup.json
 *   npm run db:restore -- backup.json
 *   npm run db:restore -- backup.json --replace
 */
import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";

const FORMAT = "agentpoker-sqlite-dump";
const VERSION = 1;

function resolveDbPath() {
  const configured = process.env.DATABASE_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured);
  }
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "agentpoker.db");
  }
  return path.join(process.cwd(), "data", "agentpoker.db");
}

function isEphemeral(dbPath) {
  return dbPath.startsWith(os.tmpdir());
}

function exportDb(dbPath) {
  if (!fs.existsSync(dbPath)) {
    return {
      format: FORMAT,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      dbPath,
      ephemeral: isEphemeral(dbPath),
      roomCount: 0,
      rooms: [],
    };
  }

  const db = new Database(dbPath, { readonly: true });
  const rows = db.prepare("SELECT data FROM rooms ORDER BY updated_at DESC").all();
  db.close();

  const rooms = rows.map((r) => JSON.parse(r.data));
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    dbPath,
    ephemeral: isEphemeral(dbPath),
    roomCount: rooms.length,
    rooms,
  };
}

function importDb(dbPath, dump, replace) {
  if (replace && fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rooms_updated ON rooms(updated_at);
  `);

  const stmt = db.prepare(`
    INSERT INTO rooms (code, data, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET
      data = excluded.data,
      updated_at = excluded.updated_at
  `);

  let restored = 0;
  let skipped = 0;
  const now = Date.now();

  for (const room of dump.rooms) {
    if (!room?.code || !Array.isArray(room.players)) {
      skipped++;
      continue;
    }
    stmt.run(
      room.code,
      JSON.stringify(room),
      room.createdAt ?? now,
      now,
    );
    restored++;
  }

  db.close();
  return { restored, skipped };
}

function usage() {
  console.log(`Usage:
  node scripts/db-dump.mjs [-o file.json]
  node scripts/db-dump.mjs --restore file.json [--replace]

Env: DATABASE_PATH (default ./data/agentpoker.db, or /tmp on Vercel)`);
}

const args = process.argv.slice(2);
const dbPath = resolveDbPath();

if (args[0] === "--restore") {
  const file = args[1];
  const replace = args.includes("--replace");
  if (!file) {
    usage();
    process.exit(1);
  }
  const dump = JSON.parse(fs.readFileSync(file, "utf8"));
  if (dump.format && dump.format !== FORMAT) {
    console.error(`Unsupported format: ${dump.format}`);
    process.exit(1);
  }
  const result = importDb(dbPath, dump, replace);
  console.log(`Restored ${result.restored} room(s) to ${dbPath} (skipped ${result.skipped})`);
  process.exit(0);
}

const outIdx = args.indexOf("-o");
const outFile = outIdx >= 0 ? args[outIdx + 1] : null;
const dump = exportDb(dbPath);
const json = JSON.stringify(dump, null, 2);

if (outFile) {
  fs.writeFileSync(outFile, json);
  console.log(`Wrote ${dump.roomCount} room(s) to ${outFile}`);
} else {
  process.stdout.write(json);
}
