import { LIMITS } from "./api-contract";
import { maybeAutoFoldDisconnected } from "./connection";
import { nextHand } from "./engine/holdem";
import type { Room } from "./engine/types";
import { getRoom, saveRoom } from "./store";

const ticking = new Map<string, Promise<Room | null>>();

/** Load room and run auto-advance / disconnect fold side effects. */
export async function getTickedRoom(code: string): Promise<Room | null> {
  const upper = code.toUpperCase();
  const pending = ticking.get(upper);
  if (pending) return pending;

  const work = (async () => {
    try {
      const room = await getRoom(upper);
      if (!room) return null;

      let changed = false;

      if (room.status === "playing" && room.game?.handOver) {
        const grace = LIMITS.handAdvanceGraceMs;
        if (!room.lastHandEndedAt) {
          room.lastHandEndedAt = Date.now();
          changed = true;
        } else if (Date.now() - room.lastHandEndedAt > grace) {
          room.lastHandEndedAt = 0;
          nextHand(room);
          changed = true;
        }
      }

      if (maybeAutoFoldDisconnected(room)) {
        changed = true;
      }

      if (changed) await saveRoom(room);
      return room;
    } finally {
      ticking.delete(upper);
    }
  })();

  ticking.set(upper, work);
  return work;
}
