import type { Room } from "./engine/types";
import { closeDb, getPool, initDb } from "./db";
import {
  cacheRoom,
  closeRedis,
  flushRoomCache,
  getCachedRoom,
} from "./redis";

// Postgres is durable storage; Redis is the shared hot-state cache.
// Room JSON shape is unchanged so the engine stays storage-agnostic.

export const persistenceEnabled = true;

export async function persistRoom(room: Room): Promise<void> {
  await initDb();
  const now = Date.now();
  await getPool().query(
    `INSERT INTO rooms (code, data, created_at, updated_at)
     VALUES ($1, $2::jsonb, $3, $4)
     ON CONFLICT (code) DO UPDATE SET
       data = EXCLUDED.data,
       updated_at = EXCLUDED.updated_at`,
    [room.code, JSON.stringify(room), room.createdAt, now],
  );
  await cacheRoom(room);
}

export async function loadRoom(code: string): Promise<Room | null> {
  const upper = code.toUpperCase();

  const cached = await getCachedRoom(upper);
  if (cached) return cached;

  await initDb();
  const result = await getPool().query(
    "SELECT data FROM rooms WHERE code = $1",
    [upper],
  );
  const row = result.rows[0] as { data: Room } | undefined;
  if (!row) return null;

  const room = row.data;
  await cacheRoom(room);
  return room;
}

export async function roomExists(code: string): Promise<boolean> {
  const upper = code.toUpperCase();
  const cached = await getCachedRoom(upper);
  if (cached) return true;

  await initDb();
  const result = await getPool().query(
    "SELECT 1 AS ok FROM rooms WHERE code = $1",
    [upper],
  );
  return result.rowCount === 1;
}

export async function listStoredRooms(): Promise<Room[]> {
  await initDb();
  const result = await getPool().query(
    "SELECT data FROM rooms ORDER BY updated_at DESC",
  );
  return result.rows.map((row) => row.data as Room);
}

export async function deleteAllRooms(): Promise<void> {
  await initDb();
  await getPool().query("DELETE FROM rooms");
  await flushRoomCache();
}

export async function resetPersistence(): Promise<void> {
  await closeDb();
  await closeRedis();
}
