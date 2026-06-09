import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";

const DEFAULT_RELATIVE = path.join("data", "agentpoker.db");

function isVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

/** True when the DB file is not durable across deploys / restarts (e.g. Vercel /tmp). */
export function isEphemeralStorage(): boolean {
  if (process.env.STORAGE_EPHEMERAL === "1") return true;
  if (isVercel() && !process.env.DATABASE_PATH) return true;
  const dbPath = resolveDbPath();
  return dbPath.startsWith(os.tmpdir());
}

export function resolveDbPath(): string {
  const configured = process.env.DATABASE_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured);
  }
  if (isVercel()) {
    return path.join(os.tmpdir(), "agentpoker.db");
  }
  return path.join(process.cwd(), DEFAULT_RELATIVE);
}

let db: Database.Database | null = null;

export function getDbPath(): string {
  return resolveDbPath();
}

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
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

  return db;
}

/** Close the singleton (tests / before restore). */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
