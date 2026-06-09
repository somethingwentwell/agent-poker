import type { Room } from "./engine/types";
import { applyAction } from "./engine/holdem";

export const CONNECT_STALE_MS = 8000;

export function isPlayerConnected(lastSeen: number, now = Date.now()): boolean {
  return now - lastSeen < CONNECT_STALE_MS;
}

/** Auto-fold when it is a stale agent's turn so the table does not stall. */
export function maybeAutoFoldDisconnected(room: Room, now = Date.now()): boolean {
  const g = room.game;
  if (room.status !== "playing" || !g || g.handOver || g.toAct == null) {
    return false;
  }
  const actorId = g.seats[g.toAct];
  const actor = room.players.find((p) => p.id === actorId);
  if (!actor || isPlayerConnected(actor.lastSeen, now)) return false;

  const result = applyAction(
    room,
    actorId,
    "fold",
    undefined,
    "Auto-folded: agent disconnected.",
  );
  return result.ok;
}
