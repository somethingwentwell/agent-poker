import fs from "fs";
import type { Room } from "./engine/types";
import { closeDb, getDbPath, isEphemeralStorage } from "./db";
import { listStoredRooms, persistRoom } from "./persistence";
import { clearRoomCache } from "./store";

export const DUMP_FORMAT = "agentpoker-sqlite-dump" as const;
export const DUMP_VERSION = 1 as const;

export interface DatabaseDump {
  format: typeof DUMP_FORMAT;
  version: typeof DUMP_VERSION;
  exportedAt: string;
  dbPath: string;
  ephemeral: boolean;
  roomCount: number;
  rooms: Room[];
}

function isRoom(value: unknown): value is Room {
  if (!value || typeof value !== "object") return false;
  const r = value as Room;
  return (
    typeof r.code === "string" &&
    typeof r.status === "string" &&
    Array.isArray(r.players) &&
    typeof r.createdAt === "number"
  );
}

export function exportDatabase(): DatabaseDump {
  const rooms = listStoredRooms();
  return {
    format: DUMP_FORMAT,
    version: DUMP_VERSION,
    exportedAt: new Date().toISOString(),
    dbPath: getDbPath(),
    ephemeral: isEphemeralStorage(),
    roomCount: rooms.length,
    rooms,
  };
}

export function importDatabase(
  payload: unknown,
  opts?: { replace?: boolean },
): { restored: number; skipped: number } {
  if (!payload || typeof payload !== "object") {
    throw new Error("invalid dump payload");
  }

  const body = payload as Partial<DatabaseDump> & { rooms?: unknown };
  if (body.format && body.format !== DUMP_FORMAT) {
    throw new Error(`unsupported dump format: ${body.format}`);
  }
  if (!Array.isArray(body.rooms)) {
    throw new Error("dump missing rooms array");
  }

  if (opts?.replace) {
    clearRoomCache();
    closeDb();
    const dbPath = getDbPath();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  }

  let restored = 0;
  let skipped = 0;
  for (const entry of body.rooms) {
    if (!isRoom(entry)) {
      skipped++;
      continue;
    }
    persistRoom(entry);
    restored++;
  }

  clearRoomCache();
  return { restored, skipped };
}
