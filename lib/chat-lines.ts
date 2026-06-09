import type { HistoryData } from "./replay-view";

export interface ChatLine {
  step: number;
  kind: "action" | "win" | "system";
  handNo: number;
  playerName?: string;
  text: string;
  thought?: string;
  ts?: number;
}

const PLAYER_TYPES = new Set([
  "fold",
  "check",
  "call",
  "raise",
  "allin",
  "blind",
  "post",
]);

export function formatChatTs(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function buildChatLines(
  data: HistoryData,
  t: (key: string, vars?: Record<string, string | number>) => string,
  handName: (name?: string) => string,
): ChatLine[] {
  const names = new Map(data.players.map((p) => [p.id, p.name]));
  const out: ChatLine[] = [];

  data.history.forEach((entry, step) => {
    if (entry.type === "win" && entry.playerId) {
      const result = data.results.find((r) => r.handNo === entry.handNo);
      const winner = result?.winners.find((w) => w.playerId === entry.playerId);
      const name = names.get(entry.playerId) ?? entry.playerId;
      out.push({
        step,
        kind: "win",
        handNo: entry.handNo,
        playerName: name,
        text: t("room.winBanner", {
          name,
          amount: winner?.amount ?? entry.amount ?? 0,
          hand: handName(winner?.handName),
        }),
        ts: entry.ts,
      });
      return;
    }

    if (entry.type === "deal") {
      out.push({
        step,
        kind: "system",
        handNo: entry.handNo,
        text: entry.note ?? entry.street,
        ts: entry.ts,
      });
      return;
    }

    if (!entry.playerId || !PLAYER_TYPES.has(entry.type)) return;

    out.push({
      step,
      kind: "action",
      handNo: entry.handNo,
      playerName: names.get(entry.playerId) ?? entry.playerId,
      text: entry.note ?? entry.type,
      thought: entry.thought,
      ts: entry.ts,
    });
  });

  return out;
}

export function activeThoughtEntry(
  data: HistoryData,
  scrubStep: number | null,
): {
  step: number;
  playerName: string;
  action: string;
  thought: string;
} | null {
  const names = new Map(data.players.map((p) => [p.id, p.name]));

  if (scrubStep !== null) {
    const entry = data.history[scrubStep];
    if (!entry?.thought || !entry.playerId) return null;
    return {
      step: scrubStep,
      playerName: names.get(entry.playerId) ?? entry.playerId,
      action: entry.note ?? entry.type,
      thought: entry.thought,
    };
  }

  for (let i = data.history.length - 1; i >= 0; i--) {
    const entry = data.history[i];
    if (!entry.thought || !entry.playerId) continue;
    return {
      step: i,
      playerName: names.get(entry.playerId) ?? entry.playerId,
      action: entry.note ?? entry.type,
      thought: entry.thought,
    };
  }

  return null;
}
