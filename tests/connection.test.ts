import { test } from "node:test";
import assert from "node:assert/strict";
import type { Room } from "../lib/engine/types.ts";
import {
  CONNECT_STALE_MS,
  isPlayerConnected,
  maybeAutoFoldDisconnected,
} from "../lib/connection.ts";
import { startMatch } from "../lib/engine/holdem.ts";
import { playerView } from "../lib/view.ts";

function makeRoom(chips: number[]): Room {
  const now = Date.now();
  const players = chips.map((c, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    token: `t${i}`,
    avatar: i,
    chips: c,
    isHost: i === 0,
    connected: true,
    lastSeen: now,
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
  } as Room;
}

test("isPlayerConnected respects stale threshold", () => {
  const now = 10_000;
  assert.equal(isPlayerConnected(now - 1000, now), true);
  assert.equal(isPlayerConnected(now - CONNECT_STALE_MS, now), false);
});

test("playerView exposes connected per seat", () => {
  const room = makeRoom([1000, 1000]);
  const now = Date.now();
  room.players[0].lastSeen = now;
  room.players[1].lastSeen = now - CONNECT_STALE_MS - 1;
  startMatch(room);

  const view = playerView(room, null);
  assert.equal(view.players[0].connected, true);
  assert.equal(view.players[1].connected, false);
});

test("maybeAutoFoldDisconnected folds stale actor", () => {
  const room = makeRoom([1000, 1000]);
  startMatch(room);
  const g = room.game!;
  const actorId = g.seats[g.toAct!];
  const actor = room.players.find((p) => p.id === actorId)!;
  actor.lastSeen = Date.now() - CONNECT_STALE_MS - 1;

  assert.equal(actor.folded, false);
  assert.ok(maybeAutoFoldDisconnected(room));
  assert.equal(actor.folded, true);
});
