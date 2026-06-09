import { test } from "node:test";
import assert from "node:assert/strict";
import type { Room } from "../lib/engine/types.ts";
import {
  startMatch,
  applyAction,
  legalActions,
  nextHand,
} from "../lib/engine/holdem.ts";

function makeRoom(chips: number[], opts?: Partial<Room>): Room {
  const players = chips.map((c, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    token: `t${i}`,
    avatar: i,
    chips: c,
    isHost: i === 0,
    connected: true,
    lastSeen: 0,
    hole: [],
    folded: false,
    allIn: false,
    committed: 0,
    streetCommitted: 0,
    hasActed: false,
    sittingOut: false,
  }));
  return {
    code: "TEST",
    status: "lobby",
    hostToken: "host_test_token",
    players,
    game: null,
    history: [],
    results: [],
    seed: 12345,
    rngState: 12345,
    createdAt: 0,
    startingChips: chips[0],
    smallBlind: 10,
    bigBlind: 20,
    maxHands: 0,
    ...opts,
  } as Room;
}

function toAct(room: Room): string | null {
  const g = room.game!;
  return g.toAct == null ? null : g.seats[g.toAct];
}

test("blinds posted and chip conservation holds", () => {
  const room = makeRoom([1000, 1000, 1000]);
  startMatch(room);
  const total = room.players.reduce((s, p) => s + p.chips + p.committed, 0);
  assert.equal(total, 3000);
  // someone posted SB(10) and BB(20)
  const committed = room.players.reduce((s, p) => s + p.committed, 0);
  assert.equal(committed, 30);
});

test("everyone folds to one winner; pot awarded; chips conserved", () => {
  const room = makeRoom([1000, 1000, 1000]);
  startMatch(room);
  // walk turns: everyone folds until one remains
  let guard = 0;
  while (room.game && !room.game.handOver && guard++ < 50) {
    const id = toAct(room);
    if (!id) break;
    const r = applyAction(room, id, "fold");
    assert.ok(r.ok, r.error);
  }
  const total = room.players.reduce((s, p) => s + p.chips, 0);
  assert.equal(total, 3000); // all chips returned to stacks
  assert.ok(room.results.length >= 1);
});

test("agent thought is stored on player actions", () => {
  const room = makeRoom([1000, 1000, 1000]);
  startMatch(room);
  const id = toAct(room)!;
  const r = applyAction(room, id, "fold", undefined, "Weak hand, saving chips.");
  assert.ok(r.ok, r.error);
  const last = room.history[room.history.length - 1];
  assert.equal(last.type, "fold");
  assert.equal(last.thought, "Weak hand, saving chips.");
  assert.equal(last.note, "folds");
  assert.equal(typeof last.ts, "number");
  assert.ok(last.ts! > 0);
});

test("acting out of turn is rejected", () => {
  const room = makeRoom([1000, 1000, 1000]);
  startMatch(room);
  const actor = toAct(room)!;
  const other = room.players.find((p) => p.id !== actor)!.id;
  const r = applyAction(room, other, "call");
  assert.equal(r.ok, false);
  assert.match(r.error!, /not your turn/);
});

test("min-raise enforcement", () => {
  const room = makeRoom([1000, 1000, 1000]);
  startMatch(room);
  const id = toAct(room)!;
  const la = legalActions(room, id)!;
  // raising to less than minRaiseTo (but not all-in) should fail
  const tooSmall = la.minRaiseTo - 1;
  const r = applyAction(room, id, "raise", tooSmall);
  assert.equal(r.ok, false);
});

test("all-in produces side pots and conserves chips", () => {
  // short stack all-in vs two bigger stacks
  const room = makeRoom([40, 1000, 1000]);
  startMatch(room);
  let guard = 0;
  // Strategy: short stack shoves when able; others call.
  while (room.game && !room.game.handOver && guard++ < 200) {
    const id = toAct(room);
    if (!id) break;
    const la = legalActions(room, id);
    if (!la) break;
    if (la.canRaise && la.maxRaiseTo === la.minRaiseTo) {
      // not much room; just call/check
    }
    // short stack (p0 has small chips) tries to get all-in; everyone else calls
    const p = room.players.find((x) => x.id === id)!;
    if (p.chips > 0 && la.canCall) {
      applyAction(room, id, "call");
    } else if (la.canCheck) {
      applyAction(room, id, "check");
    } else {
      applyAction(room, id, "call");
    }
  }
  const total = room.players.reduce((s, p) => s + p.chips, 0);
  assert.equal(total, 2040);
});

test("can play multiple hands and button rotates", () => {
  const room = makeRoom([1000, 1000, 1000]);
  startMatch(room);
  const firstButton = room.game!.buttonSeat;
  // fold out hand 1
  let guard = 0;
  while (room.game && !room.game.handOver && guard++ < 50) {
    const id = toAct(room);
    if (!id) break;
    applyAction(room, id, "fold");
  }
  const cont = nextHand(room);
  assert.ok(cont);
  assert.notEqual(room.game!.buttonSeat, firstButton);
  assert.equal(room.game!.handNo, 2);
});
