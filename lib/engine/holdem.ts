import type {
  ActionType,
  Card,
  GameState,
  HandResult,
  LegalActions,
  Player,
  Room,
  Street,
} from "./types";
import { makeDeck, shuffle } from "./cards";
import { evaluate } from "./evaluator";

// ---------- helpers ----------

function activePlayers(room: Room): Player[] {
  // players still in the match (have chips or are sitting out due to 0 chips are excluded from new hands)
  return room.players.filter((p) => !p.sittingOut);
}

function inHand(room: Room): Player[] {
  return room.players.filter((p) => !p.sittingOut && !p.folded);
}

function byId(room: Room, id: string): Player | undefined {
  return room.players.find((p) => p.id === id);
}

function record(
  room: Room,
  playerId: string | null,
  type: ActionType | "deal" | "win" | "post",
  amount?: number,
  note?: string,
  thought?: string,
) {
  const g = room.game!;
  const stacks: Record<string, number> = {};
  const streetCommitted: Record<string, number> = {};
  for (const p of room.players) {
    stacks[p.id] = p.chips;
    streetCommitted[p.id] = p.streetCommitted;
  }
  room.history.push({
    handNo: g.handNo,
    street: g.street,
    playerId,
    type,
    amount,
    board: g.board.slice(),
    pot: room.players.reduce((s, p) => s + p.committed, 0),
    stacks,
    streetCommitted,
    note,
    thought,
    ts: Date.now(),
  });
}

function resetHandState(room: Room) {
  for (const p of room.players) {
    p.hole = [];
    p.folded = false;
    p.allIn = false;
    p.committed = 0;
    p.streetCommitted = 0;
    p.hasActed = false;
    p.sittingOut = p.chips <= 0;
  }
}

// ---------- match / hand lifecycle ----------

export function startMatch(room: Room) {
  room.status = "playing";
  room.game = {
    handNo: 0,
    street: "preflop",
    deck: [],
    board: [],
    pot: 0,
    toAct: null,
    buttonSeat: -1,
    currentBet: 0,
    lastRaiseSize: room.bigBlind,
    seats: [],
    smallBlind: room.smallBlind,
    bigBlind: room.bigBlind,
    handOver: false,
  };
  startHand(room);
}

export function startHand(room: Room) {
  const g = room.game!;
  resetHandState(room);

  const seated = activePlayers(room);
  if (seated.length < 2) {
    room.status = "finished";
    return;
  }

  g.handNo += 1;
  g.street = "preflop";
  g.board = [];
  g.currentBet = 0;
  g.lastRaiseSize = room.bigBlind;
  g.handOver = false;
  g.seats = seated.map((p) => p.id);

  // advance button
  g.buttonSeat = (g.buttonSeat + 1) % g.seats.length;

  // shuffle fresh deck deterministically
  const { deck, rngState } = shuffle(makeDeck(), room.rngState);
  room.rngState = rngState;
  g.deck = deck;

  // deal 2 hole cards each, starting left of button
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < g.seats.length; i++) {
      const seat = (g.buttonSeat + 1 + i) % g.seats.length;
      const p = byId(room, g.seats[seat])!;
      p.hole.push(g.deck.pop()!);
    }
  }
  record(room, null, "deal", undefined, `Hand #${g.handNo} dealt`);

  // post blinds. Heads-up: button is SB.
  const n = g.seats.length;
  let sbSeat: number, bbSeat: number, firstToAct: number;
  if (n === 2) {
    sbSeat = g.buttonSeat;
    bbSeat = (g.buttonSeat + 1) % n;
    firstToAct = sbSeat; // SB/button acts first preflop heads-up
  } else {
    sbSeat = (g.buttonSeat + 1) % n;
    bbSeat = (g.buttonSeat + 2) % n;
    firstToAct = (g.buttonSeat + 3) % n;
  }

  postBlind(room, g.seats[sbSeat], room.smallBlind);
  postBlind(room, g.seats[bbSeat], room.bigBlind);
  g.currentBet = room.bigBlind;
  g.lastRaiseSize = room.bigBlind;

  // first to act
  g.toAct = nextToActFrom(room, firstToAct);
}

function postBlind(room: Room, playerId: string, amount: number) {
  const p = byId(room, playerId)!;
  const pay = Math.min(amount, p.chips);
  p.chips -= pay;
  p.committed += pay;
  p.streetCommitted += pay;
  if (p.chips === 0) p.allIn = true;
  record(room, playerId, "post", pay, `posts ${pay}`);
}

// Returns seat index of next player who can act starting at `from`, or null if none.
function nextToActFrom(room: Room, from: number): number | null {
  const g = room.game!;
  const n = g.seats.length;
  for (let i = 0; i < n; i++) {
    const seat = (from + i) % n;
    const p = byId(room, g.seats[seat])!;
    if (!p.folded && !p.allIn) return seat;
  }
  return null;
}

// ---------- legal actions ----------

export function legalActions(room: Room, playerId: string): LegalActions | null {
  const g = room.game;
  if (!g || g.toAct == null) return null;
  if (g.seats[g.toAct] !== playerId) return null;
  const p = byId(room, playerId)!;
  if (p.folded || p.allIn) return null;

  const toCall = g.currentBet - p.streetCommitted;
  const canCheck = toCall <= 0;
  const canCall = toCall > 0 && p.chips > 0;
  const callAmount = Math.min(toCall, p.chips);

  // raising
  const maxRaiseTo = p.streetCommitted + p.chips; // all-in cap (total street commit)
  const minRaiseTo = g.currentBet + g.lastRaiseSize;
  // can only raise if you have chips beyond the call
  const canRaise = p.chips > toCall;

  return {
    canFold: true,
    canCheck,
    canCall,
    callAmount,
    canRaise,
    minRaiseTo: Math.min(minRaiseTo, maxRaiseTo),
    maxRaiseTo,
  };
}

// ---------- apply action ----------

export interface ApplyResult {
  ok: boolean;
  error?: string;
}

export function applyAction(
  room: Room,
  playerId: string,
  type: "fold" | "check" | "call" | "raise",
  amount?: number,
  thought?: string,
): ApplyResult {
  const g = room.game;
  if (!g) return { ok: false, error: "no active game" };
  if (g.toAct == null) return { ok: false, error: "no one to act" };
  if (g.seats[g.toAct] !== playerId) return { ok: false, error: "not your turn" };
  const legal = legalActions(room, playerId);
  if (!legal) return { ok: false, error: "cannot act" };
  const p = byId(room, playerId)!;

  if (type === "fold") {
    p.folded = true;
    p.hasActed = true;
    record(room, playerId, "fold", undefined, "folds", thought);
  } else if (type === "check") {
    if (!legal.canCheck) return { ok: false, error: "cannot check, must call or fold" };
    p.hasActed = true;
    record(room, playerId, "check", undefined, "checks", thought);
  } else if (type === "call") {
    if (!legal.canCall) return { ok: false, error: "nothing to call" };
    const pay = legal.callAmount;
    p.chips -= pay;
    p.committed += pay;
    p.streetCommitted += pay;
    p.hasActed = true;
    if (p.chips === 0) p.allIn = true;
    record(room, playerId, p.allIn ? "allin" : "call", pay, `calls ${pay}`, thought);
  } else if (type === "raise") {
    if (!legal.canRaise) return { ok: false, error: "cannot raise" };
    let raiseTo = amount ?? legal.minRaiseTo;
    // clamp to legal range
    if (raiseTo > legal.maxRaiseTo) raiseTo = legal.maxRaiseTo;
    const isAllIn = raiseTo === legal.maxRaiseTo;
    // enforce min-raise unless going all-in for less
    if (raiseTo < legal.minRaiseTo && !isAllIn) {
      return { ok: false, error: `raise must be at least ${legal.minRaiseTo}` };
    }
    const pay = raiseTo - p.streetCommitted;
    if (pay > p.chips) return { ok: false, error: "not enough chips" };
    const raiseSize = raiseTo - g.currentBet;
    p.chips -= pay;
    p.committed += pay;
    p.streetCommitted += pay;
    p.hasActed = true;
    if (p.chips === 0) p.allIn = true;
    // a full raise reopens action; record raise size for min-raise
    if (raiseSize >= g.lastRaiseSize) {
      g.lastRaiseSize = raiseSize;
      // reopen: others must act again
      for (const other of room.players) {
        if (other.id !== playerId && !other.folded && !other.allIn) {
          other.hasActed = false;
        }
      }
    }
    g.currentBet = raiseTo;
    record(room, playerId, p.allIn ? "allin" : "raise", raiseTo, `raises to ${raiseTo}`, thought);
  }

  advance(room);
  return { ok: true };
}

// ---------- round / street advancement ----------

function bettingRoundComplete(room: Room): boolean {
  const g = room.game!;
  const contenders = room.players.filter((p) => !p.folded && !p.sittingOut);
  if (contenders.length <= 1) return true;
  const canAct = contenders.filter((p) => !p.allIn);
  // everyone who can act has acted and matched the current bet
  for (const p of canAct) {
    if (!p.hasActed) return false;
    if (p.streetCommitted !== g.currentBet) return false;
  }
  return true;
}

function advance(room: Room) {
  const g = room.game!;

  // if only one player remains (others folded), award immediately
  const remaining = inHand(room);
  if (remaining.length <= 1) {
    awardUncontested(room);
    return;
  }

  if (bettingRoundComplete(room)) {
    nextStreet(room);
  } else {
    // move to next actor
    g.toAct = nextToActFrom(room, (g.toAct! + 1) % g.seats.length);
    // if no one can act (all all-in), run out the board
    if (g.toAct == null) {
      runOutAndShowdown(room);
    }
  }
}

function resetStreetCommit(room: Room) {
  for (const p of room.players) {
    p.streetCommitted = 0;
    p.hasActed = false;
  }
}

function dealNextStreet(room: Room) {
  const g = room.game!;
  if (g.street === "preflop") {
    g.deck.pop(); // burn
    g.board.push(g.deck.pop()!, g.deck.pop()!, g.deck.pop()!);
    g.street = "flop";
    record(room, null, "deal", undefined, "Flop");
  } else if (g.street === "flop") {
    g.deck.pop();
    g.board.push(g.deck.pop()!);
    g.street = "turn";
    record(room, null, "deal", undefined, "Turn");
  } else if (g.street === "turn") {
    g.deck.pop();
    g.board.push(g.deck.pop()!);
    g.street = "river";
    record(room, null, "deal", undefined, "River");
  } else if (g.street === "river") {
    g.street = "showdown";
  }
}

function nextStreet(room: Room) {
  const g = room.game!;
  g.currentBet = 0;
  g.lastRaiseSize = room.bigBlind;
  resetStreetCommit(room);

  // if everyone left is all-in, just run it out
  const canAct = inHand(room).filter((p) => !p.allIn);

  dealNextStreet(room);

  if (g.street === "showdown") {
    showdown(room);
    return;
  }

  if (canAct.length <= 1) {
    // not enough players able to bet; deal out remaining streets to showdown
    runOutAndShowdown(room);
    return;
  }

  // first to act post-flop = first active player left of button
  g.toAct = nextToActFrom(room, (g.buttonSeat + 1) % g.seats.length);
  if (g.toAct == null) runOutAndShowdown(room);
}

function runOutAndShowdown(room: Room) {
  const g = room.game!;
  while (g.street !== "showdown") {
    dealNextStreet(room);
  }
  showdown(room);
}

// ---------- pots & showdown ----------

function awardUncontested(room: Room) {
  const g = room.game!;
  const winner = inHand(room)[0];
  const pot = room.players.reduce((s, p) => s + p.committed, 0);
  winner.chips += pot;
  record(room, winner.id, "win", pot, `${winner.name} wins ${pot} (uncontested)`);
  room.results.push({
    handNo: g.handNo,
    board: g.board.slice(),
    winners: [{ playerId: winner.id, amount: pot }],
    reveal: [],
  });
  finishHand(room);
}

// Build side pots from players' committed amounts.
function buildPots(room: Room): { amount: number; eligible: string[] }[] {
  const contenders = room.players.filter((p) => p.committed > 0);
  const pots: { amount: number; eligible: string[] }[] = [];
  // distinct commit levels among players still in hand
  const levels = [...new Set(contenders.map((p) => p.committed))].sort((a, b) => a - b);
  let prev = 0;
  for (const lvl of levels) {
    const layer = lvl - prev;
    const contributors = contenders.filter((p) => p.committed >= lvl);
    const amount = layer * contributors.length;
    // eligible to win this pot = contributors who have NOT folded
    const eligible = contributors.filter((p) => !p.folded).map((p) => p.id);
    if (amount > 0 && eligible.length > 0) {
      pots.push({ amount, eligible });
    } else if (amount > 0) {
      // folded-only layer: add to previous pot if any, else carry
      if (pots.length) pots[pots.length - 1].amount += amount;
    }
    prev = lvl;
  }
  return pots;
}

function showdown(room: Room) {
  const g = room.game!;
  const contenders = inHand(room);
  const evals = new Map<string, ReturnType<typeof evaluate>>();
  for (const p of contenders) {
    evals.set(p.id, evaluate([...p.hole, ...g.board]));
  }

  const pots = buildPots(room);
  const winnersAgg = new Map<string, number>();

  for (const pot of pots) {
    const elig = pot.eligible.filter((id) => evals.has(id));
    if (elig.length === 0) continue;
    let best = -Infinity;
    for (const id of elig) best = Math.max(best, evals.get(id)!.score);
    const winners = elig.filter((id) => evals.get(id)!.score === best);
    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;
    for (const id of winners) {
      let amt = share;
      if (remainder > 0) { amt += 1; remainder -= 1; }
      const pl = byId(room, id)!;
      pl.chips += amt;
      winnersAgg.set(id, (winnersAgg.get(id) ?? 0) + amt);
    }
  }

  const winnerList = [...winnersAgg.entries()].map(([playerId, amount]) => ({
    playerId,
    amount,
    handName: evals.get(playerId)?.name,
  }));
  for (const w of winnerList) {
    record(room, w.playerId, "win", w.amount, `${byId(room, w.playerId)!.name} wins ${w.amount} (${w.handName})`);
  }

  room.results.push({
    handNo: g.handNo,
    board: g.board.slice(),
    winners: winnerList,
    reveal: contenders.map((p) => ({ playerId: p.id, hole: p.hole.slice() })),
  });

  finishHand(room);
}

function finishHand(room: Room) {
  const g = room.game!;
  g.toAct = null;
  g.handOver = true;

  // mark broke players sitting out
  for (const p of room.players) if (p.chips <= 0) p.sittingOut = true;

  const alive = room.players.filter((p) => p.chips > 0);
  const reachedMax = room.maxHands > 0 && g.handNo >= room.maxHands;
  if (alive.length <= 1 || reachedMax) {
    room.status = "finished";
  }
}

// Start the next hand (called by API after a short delay / on demand).
export function nextHand(room: Room): boolean {
  if (room.status !== "playing") return false;
  const g = room.game;
  if (!g || !g.handOver) return false;
  startHand(room);
  return room.status === "playing";
}
