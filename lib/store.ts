import { AVATAR_COUNT } from "./avatars";
import { LIMITS } from "./api-contract";
import type { Player, Room } from "./engine/types";
import {
  loadRoom,
  persistRoom,
  roomExists,
  listStoredRooms,
} from "./persistence";

// Room store: SQLite is source of truth, with a process-local cache for hot polls.
// TODO: Redis for multi-instance cache + Postgres for long-term storage.

interface Store {
  rooms: Map<string, Room>;
}

const g = globalThis as unknown as { __agentpoker?: Store };
if (!g.__agentpoker) {
  g.__agentpoker = { rooms: new Map() };
}
const cache = g.__agentpoker.rooms;

const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
let counter = 0;

function pseudoRandom(): number {
  counter = (counter + 1) % 1_000_000;
  const t =
    typeof process !== "undefined" && process.hrtime
      ? Number(process.hrtime.bigint() % 1000000n)
      : Date.now() % 1000000;
  return (t * 31 + counter * 17) % ROOM_CHARS.length;
}

export function genRoomCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) code += ROOM_CHARS[pseudoRandom()];
  if (cache.has(code) || roomExists(code)) return genRoomCode();
  return code;
}

export function genId(prefix = "p"): string {
  let s = prefix + "_";
  for (let i = 0; i < 16; i++) s += ROOM_CHARS[pseudoRandom()].toLowerCase();
  return s;
}

export function genToken(): string {
  let s = "";
  for (let i = 0; i < 32; i++) s += ROOM_CHARS[pseudoRandom()].toLowerCase();
  return s;
}

export function getRoom(code: string): Room | undefined {
  const upper = code.toUpperCase();
  const cached = cache.get(upper);
  if (cached) return cached;

  const loaded = loadRoom(upper);
  if (!loaded) return undefined;

  if (!loaded.hostToken) {
    loaded.hostToken = genToken();
    persistRoom(loaded);
  }

  cache.set(upper, loaded);
  return loaded;
}

export async function getRoomAsync(code: string): Promise<Room | undefined> {
  return getRoom(code);
}

export function saveRoom(room: Room): void {
  cache.set(room.code, room);
  persistRoom(room);
}

export function createRoom(opts: {
  startingChips?: number;
  smallBlind?: number;
  bigBlind?: number;
  maxHands?: number;
  seed?: number;
}): Room {
  const code = genRoomCode();
  const seed = opts.seed ?? Math.floor(Date.now() % 2147483647);
  const room: Room = {
    code,
    status: "lobby",
    hostToken: genToken(),
    players: [],
    game: null,
    history: [],
    results: [],
    seed,
    rngState: seed,
    createdAt: Date.now(),
    startingChips: opts.startingChips ?? LIMITS.defaultStartingChips,
    smallBlind: opts.smallBlind ?? LIMITS.defaultSmallBlind,
    bigBlind: opts.bigBlind ?? LIMITS.defaultBigBlind,
    maxHands: opts.maxHands ?? 0,
  };
  saveRoom(room);
  return room;
}

export function addPlayer(room: Room, name: string, isHost = false): Player {
  const usedAvatars = new Set(room.players.map((p) => p.avatar));
  let avatar = Math.floor(Math.random() * AVATAR_COUNT);
  let guard = 0;
  while (usedAvatars.has(avatar) && guard++ < AVATAR_COUNT) {
    avatar = (avatar + 1) % AVATAR_COUNT;
  }
  const player: Player = {
    id: genId(),
    name: name.slice(0, 24) || `agent-${room.players.length + 1}`,
    token: genToken(),
    avatar,
    chips: room.startingChips,
    isHost,
    connected: true,
    lastSeen: Date.now(),
    hole: [],
    folded: false,
    allIn: false,
    committed: 0,
    streetCommitted: 0,
    hasActed: false,
    sittingOut: false,
  };
  room.players.push(player);
  return player;
}

export function authPlayer(
  room: Room,
  playerId: string,
  token: string,
): Player | null {
  const p = room.players.find((x) => x.id === playerId);
  if (!p || p.token !== token) return null;
  p.lastSeen = Date.now();
  p.connected = true;
  return p;
}

export function listRooms(): Room[] {
  for (const room of listStoredRooms()) {
    cache.set(room.code, room);
  }
  return [...cache.values()];
}

export function clearRoomCache(): void {
  cache.clear();
}
