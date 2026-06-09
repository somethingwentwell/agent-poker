import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REPLAY_FORMAT,
  buildReplayExport,
  parseReplayFile,
} from "../lib/replay-export.ts";
import type { Room } from "../lib/engine/types.ts";

function makeFinishedRoom(): Room {
  return {
    code: "TEST1",
    status: "finished",
    hostToken: "host",
    players: [
      {
        id: "p0",
        name: "Alice",
        token: "t0",
        avatar: 0,
        chips: 500,
        isHost: true,
        connected: true,
        lastSeen: 0,
        hole: [],
        folded: false,
        allIn: false,
        committed: 0,
        streetCommitted: 0,
        hasActed: false,
        sittingOut: false,
      },
    ],
    game: null,
    history: [
      {
        handNo: 1,
        street: "preflop",
        playerId: "p0",
        type: "fold",
        board: [],
        pot: 30,
        stacks: { p0: 500 },
        streetCommitted: { p0: 0 },
        note: "folds",
        thought: "Folding because the hand is too weak to continue.",
        ts: 1,
      },
    ],
    results: [],
    seed: 1,
    rngState: 1,
    createdAt: 1,
    startingChips: 500,
    smallBlind: 10,
    bigBlind: 20,
    maxHands: 0,
  };
}

test("buildReplayExport wraps room history", () => {
  const exp = buildReplayExport(makeFinishedRoom());
  assert.equal(exp.format, REPLAY_FORMAT);
  assert.equal(exp.code, "TEST1");
  assert.equal(exp.history.length, 1);
  assert.equal(exp.players[0].name, "Alice");
});

test("parseReplayFile accepts export and rejects empty history", () => {
  const exp = buildReplayExport(makeFinishedRoom());
  const ok = parseReplayFile(exp);
  assert.equal(ok.ok, true);

  const bad = parseReplayFile({ ...exp, history: [] });
  assert.equal(bad.ok, false);
});
