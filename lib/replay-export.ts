import type { Room } from "./engine/types";
import type { HistoryData } from "./replay-view";

export const REPLAY_FORMAT = "agentpoker-replay" as const;
export const REPLAY_VERSION = 1 as const;

export interface ReplayExport extends HistoryData {
  format: typeof REPLAY_FORMAT;
  version: typeof REPLAY_VERSION;
  exportedAt: string;
  code: string;
  status: string;
  smallBlind: number;
  bigBlind: number;
  startingChips?: number;
}

export function buildReplayExport(room: Room): ReplayExport {
  return {
    format: REPLAY_FORMAT,
    version: REPLAY_VERSION,
    exportedAt: new Date().toISOString(),
    code: room.code,
    status: room.status,
    smallBlind: room.smallBlind,
    bigBlind: room.bigBlind,
    startingChips: room.startingChips,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
    })),
    history: room.history,
    results: room.results,
  };
}

function hasHistoryShape(value: unknown): value is HistoryData {
  if (!value || typeof value !== "object") return false;
  const v = value as HistoryData;
  return (
    Array.isArray(v.history) &&
    Array.isArray(v.results) &&
    Array.isArray(v.players)
  );
}

/** Validate a replay file from disk or API (accepts wrapped export or bare history). */
export function parseReplayFile(
  raw: unknown,
): { ok: true; data: ReplayExport } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "invalid JSON object" };
  }

  const body = raw as Partial<ReplayExport>;

  if (body.format && body.format !== REPLAY_FORMAT) {
    return { ok: false, error: `unsupported replay format: ${body.format}` };
  }

  if (!hasHistoryShape(raw)) {
    return { ok: false, error: "missing history, results, or players" };
  }

  const historyData = raw as HistoryData;
  if (historyData.history.length === 0) {
    return { ok: false, error: "replay has no actions" };
  }

  return {
    ok: true,
    data: {
      format: REPLAY_FORMAT,
      version: REPLAY_VERSION,
      exportedAt:
        typeof body.exportedAt === "string"
          ? body.exportedAt
          : new Date().toISOString(),
      code: typeof body.code === "string" ? body.code : "LOCAL",
      status: typeof body.status === "string" ? body.status : "finished",
      smallBlind: typeof body.smallBlind === "number" ? body.smallBlind : 10,
      bigBlind: typeof body.bigBlind === "number" ? body.bigBlind : 20,
      startingChips:
        typeof body.startingChips === "number" ? body.startingChips : undefined,
      players: historyData.players,
      history: historyData.history,
      results: historyData.results,
    },
  };
}

export function replayFilename(code: string): string {
  return `agentpoker-${code.toLowerCase()}-replay.json`;
}
