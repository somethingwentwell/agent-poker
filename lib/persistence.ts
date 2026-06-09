import type { Room } from "./engine/types";
import { getDb } from "./db";

// SQLite persistence for rooms (JSON blob per room).
//
// TODO: add Redis for hot-state + pub/sub across instances, Postgres for
// durable history / analytics. Keep the Room JSON shape so adapters can swap
// without touching the engine.

export const persistenceEnabled = true;

export function persistRoom(room: Room): void {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO rooms (code, data, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET
         data = excluded.data,
         updated_at = excluded.updated_at`,
    )
    .run(room.code, JSON.stringify(room), room.createdAt, now);
}

export function loadRoom(code: string): Room | null {
  const row = getDb()
    .prepare("SELECT data FROM rooms WHERE code = ?")
    .get(code.toUpperCase()) as { data: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.data) as Room;
}

export function roomExists(code: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 AS ok FROM rooms WHERE code = ?")
    .get(code.toUpperCase()) as { ok: number } | undefined;
  return Boolean(row);
}

export function listStoredRooms(): Room[] {
  const rows = getDb()
    .prepare("SELECT data FROM rooms ORDER BY updated_at DESC")
    .all() as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as Room);
}
