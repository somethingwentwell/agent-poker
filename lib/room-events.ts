import { authPlayer } from "./store";
import { getTickedRoom } from "./room-tick";
import type { Room } from "./engine/types";
import { playerView, roomMeta } from "./view";
import { ensureEventsSubscriber } from "./redis";

export type RoomEventPayload = {
  type: "room";
  meta: ReturnType<typeof roomMeta>;
  state: ReturnType<typeof playerView> | null;
  history: ReturnType<typeof roomHistory> | null;
};

export type SseOutbound =
  | RoomEventPayload
  | { type: "ping" }
  | { type: "error"; message: string };

export interface RoomEventClient {
  id: string;
  code: string;
  playerId: string | null;
  token: string | null;
  revealAll: boolean;
  enqueue: (chunk: string) => void;
  closed: boolean;
}

interface EventHub {
  clients: Map<string, Set<RoomEventClient>>;
}

const g = globalThis as unknown as { __agentpokerEvents?: EventHub };
if (!g.__agentpokerEvents) {
  g.__agentpokerEvents = { clients: new Map() };
}
const hub = g.__agentpokerEvents;

export function formatSse(data: SseOutbound, event?: string): string {
  let out = "";
  if (event) out += `event: ${event}\n`;
  out += `data: ${JSON.stringify(data)}\n\n`;
  return out;
}

export function roomHistory(room: Room) {
  return {
    code: room.code,
    status: room.status,
    smallBlind: room.smallBlind,
    bigBlind: room.bigBlind,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
    })),
    history: room.history,
    results: room.results,
  };
}

function buildRoomEvent(room: Room, client: RoomEventClient): RoomEventPayload {
  let viewerId: string | null = null;
  if (client.playerId && client.token) {
    const player = authPlayer(room, client.playerId, client.token);
    if (player) viewerId = player.id;
  }

  const revealAll = viewerId === null && client.revealAll;

  return {
    type: "room",
    meta: roomMeta(room),
    state:
      room.status === "lobby"
        ? null
        : playerView(room, viewerId, revealAll),
    history: room.status === "lobby" ? null : roomHistory(room),
  };
}

export function subscribeRoomEvents(client: RoomEventClient): () => void {
  const upper = client.code.toUpperCase();
  if (!hub.clients.has(upper)) hub.clients.set(upper, new Set());
  hub.clients.get(upper)!.add(client);

  void ensureEventsSubscriber((code) => {
    void broadcastRoom(code);
  });

  return () => {
    hub.clients.get(upper)?.delete(client);
    if (hub.clients.get(upper)?.size === 0) hub.clients.delete(upper);
  };
}

export async function broadcastRoom(code: string): Promise<void> {
  const upper = code.toUpperCase();
  const clients = hub.clients.get(upper);
  if (!clients || clients.size === 0) return;

  const room = await getTickedRoom(upper);
  if (!room) {
    for (const client of clients) {
      if (client.closed) continue;
      client.enqueue(
        formatSse({ type: "error", message: "room not found" }, "error"),
      );
    }
    return;
  }

  for (const client of clients) {
    if (client.closed) continue;
    client.enqueue(formatSse(buildRoomEvent(room, client)));
  }
}

export async function pushRoomSnapshot(client: RoomEventClient): Promise<void> {
  const room = await getTickedRoom(client.code);
  if (!room) {
    client.enqueue(
      formatSse({ type: "error", message: "room not found" }, "error"),
    );
    return;
  }
  client.enqueue(formatSse(buildRoomEvent(room, client)));
}
