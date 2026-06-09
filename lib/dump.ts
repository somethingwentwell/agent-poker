import type { Room } from "./engine/types";
import { getDatabaseUrl, isEphemeralStorage } from "./db";
import { getRedisUrl } from "./redis";
import {
  deleteAllRooms,
  listStoredRooms,
  persistRoom,
} from "./persistence";
import { clearRoomCache } from "./store";

export const DUMP_FORMAT = "agentpoker-dump" as const;
export const LEGACY_DUMP_FORMAT = "agentpoker-sqlite-dump" as const;
export const DUMP_VERSION = 2 as const;

export interface DatabaseDump {
  format: typeof DUMP_FORMAT;
  version: typeof DUMP_VERSION;
  exportedAt: string;
  databaseUrl: string;
  redisUrl: string;
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

export async function exportDatabase(): Promise<DatabaseDump> {
  const rooms = await listStoredRooms();
  return {
    format: DUMP_FORMAT,
    version: DUMP_VERSION,
    exportedAt: new Date().toISOString(),
    databaseUrl: getDatabaseUrl(),
    redisUrl: getRedisUrl(),
    ephemeral: isEphemeralStorage(),
    roomCount: rooms.length,
    rooms,
  };
}

export async function importDatabase(
  payload: unknown,
  opts?: { replace?: boolean },
): Promise<{ restored: number; skipped: number }> {
  if (!payload || typeof payload !== "object") {
    throw new Error("invalid dump payload");
  }

  const body = payload as Partial<DatabaseDump> & { rooms?: unknown };
  if (
    body.format &&
    body.format !== DUMP_FORMAT &&
    body.format !== LEGACY_DUMP_FORMAT
  ) {
    throw new Error(`unsupported dump format: ${body.format}`);
  }
  if (!Array.isArray(body.rooms)) {
    throw new Error("dump missing rooms array");
  }

  if (opts?.replace) {
    clearRoomCache();
    await deleteAllRooms();
  }

  let restored = 0;
  let skipped = 0;
  for (const entry of body.rooms) {
    if (!isRoom(entry)) {
      skipped++;
      continue;
    }
    await persistRoom(entry);
    restored++;
  }

  clearRoomCache();
  return { restored, skipped };
}
