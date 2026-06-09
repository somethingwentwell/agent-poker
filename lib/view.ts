import type { Room } from "./engine/types";
import { legalActions } from "./engine/holdem";
import { isPlayerConnected } from "./connection";

// Public lobby/meta view (no private cards).
export function roomMeta(room: Room) {
  const now = Date.now();
  return {
    code: room.code,
    status: room.status,
    smallBlind: room.smallBlind,
    bigBlind: room.bigBlind,
    startingChips: room.startingChips,
    handNo: room.game?.handNo ?? 0,
    count: room.players.length,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      chips: p.chips,
      isHost: p.isHost,
      connected: isPlayerConnected(p.lastSeen, now),
      folded: p.folded,
      allIn: p.allIn,
      sittingOut: p.sittingOut,
      streetCommitted: p.streetCommitted,
    })),
  };
}

// Per-player redacted game state. Reveals own hole cards; hides others until showdown.
// Spectators may pass revealAll (god-mode) — ignored when viewerId is set (agents).
export function playerView(
  room: Room,
  viewerId: string | null,
  revealAll = false,
) {
  const g = room.game;
  const showdownReveal =
    g?.street === "showdown" || room.status === "finished";
  const godMode = revealAll && viewerId === null;
  const now = Date.now();

  const players = room.players.map((p) => {
    const showHole =
      godMode ||
      p.id === viewerId ||
      (showdownReveal && !p.folded);
    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      chips: p.chips,
      folded: p.folded,
      allIn: p.allIn,
      sittingOut: p.sittingOut,
      committed: p.committed,
      streetCommitted: p.streetCommitted,
      hole: showHole ? p.hole : p.hole.map(() => "??"),
      isTurn: g?.toAct != null && g.seats[g.toAct] === p.id,
      connected: isPlayerConnected(p.lastSeen, now),
    };
  });

  const legal = viewerId ? legalActions(room, viewerId) : null;

  return {
    code: room.code,
    status: room.status,
    handNo: g?.handNo ?? 0,
    street: g?.street ?? null,
    board: g?.board ?? [],
    pot: room.players.reduce((s, p) => s + p.committed, 0),
    currentBet: g?.currentBet ?? 0,
    toAct: g && g.toAct != null ? g.seats[g.toAct] : null,
    buttonPlayer:
      g && g.seats.length ? g.seats[g.buttonSeat] : null,
    youAreToAct: g != null && g.toAct != null && g.seats[g.toAct] === viewerId,
    legalActions: legal,
    handOver: g?.handOver ?? false,
    players,
    smallBlind: room.smallBlind,
    bigBlind: room.bigBlind,
  };
}
