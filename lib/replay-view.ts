import type { SeatPlayer } from "@/components/Seat";

export interface HistoryAction {
  handNo: number;
  street: string;
  playerId: string | null;
  type: string;
  amount?: number;
  board: string[];
  pot: number;
  stacks?: Record<string, number>;
  streetCommitted?: Record<string, number>;
  note?: string;
  thought?: string;
  ts?: number;
}

export interface HistoryData {
  players: { id: string; name: string; avatar: number }[];
  history: HistoryAction[];
  results: {
    handNo: number;
    board: string[];
    winners: { playerId: string; amount: number; handName?: string }[];
    reveal: { playerId: string; hole: string[] }[];
  }[];
}

export interface ReplayFeltView {
  players: SeatPlayer[];
  board: string[];
  pot: number;
  handNo: number;
  winners: string[];
  centerLabel: string;
  street: string;
  note?: string;
  thought?: string;
}

export function buildReplayView(
  data: HistoryData,
  step: number,
  handLabel: string,
  revealAll = false,
): ReplayFeltView | null {
  const steps = data.history;
  const cur = steps[step];
  if (!cur) return null;

  const result = data.results.find((r) => r.handNo === cur.handNo);
  const revealMap = new Map(
    (result?.reveal ?? []).map((r) => [r.playerId, r.hole]),
  );
  const reachedWin = steps
    .slice(0, step + 1)
    .some((s) => s.handNo === cur.handNo && s.type === "win");
  const showHoles = revealAll || reachedWin;
  const winners =
    reachedWin && result ? result.winners.map((w) => w.playerId) : [];

  const players: SeatPlayer[] = data.players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    chips: cur.stacks?.[p.id] ?? 0,
    streetCommitted: cur.streetCommitted?.[p.id] ?? 0,
    hole: showHoles ? (revealMap.get(p.id) ?? ["??", "??"]) : ["??", "??"],
    isTurn: cur.playerId === p.id,
  }));

  return {
    players,
    board: cur.board,
    pot: cur.pot,
    handNo: cur.handNo,
    winners,
    centerLabel: `${handLabel}${cur.handNo} · ${cur.note ?? cur.street}`,
    street: cur.street,
    note: cur.note,
    thought: cur.thought,
  };
}
