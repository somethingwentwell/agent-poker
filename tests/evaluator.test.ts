import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, compareEval, HandCategory } from "../lib/engine/evaluator.ts";

test("royal flush beats everything", () => {
  const rf = evaluate(["As", "Ks", "Qs", "Js", "Ts", "2d", "3c"]);
  assert.equal(rf.category, HandCategory.StraightFlush);
});

test("quads beat full house", () => {
  const quads = evaluate(["9s", "9h", "9d", "9c", "Kd", "2c", "3h"]);
  const boat = evaluate(["Ks", "Kh", "Kd", "2s", "2h", "5c", "7d"]);
  assert.equal(quads.category, HandCategory.Quads);
  assert.equal(boat.category, HandCategory.FullHouse);
  assert.ok(compareEval(quads, boat) > 0);
});

test("flush beats straight", () => {
  const flush = evaluate(["2s", "5s", "8s", "Js", "Ks", "3d", "4c"]);
  const straight = evaluate(["5d", "6c", "7h", "8s", "9d", "2c", "3h"]);
  assert.equal(flush.category, HandCategory.Flush);
  assert.equal(straight.category, HandCategory.Straight);
  assert.ok(compareEval(flush, straight) > 0);
});

test("wheel straight A-2-3-4-5 detected", () => {
  const wheel = evaluate(["As", "2d", "3c", "4h", "5s", "Kd", "Qc"]);
  assert.equal(wheel.category, HandCategory.Straight);
  // high card of wheel is 5
  assert.equal(wheel.tiebreak[0], 5);
});

test("higher straight beats lower straight", () => {
  const hi = evaluate(["Ts", "Jd", "Qc", "Kh", "As", "2c", "3d"]);
  const lo = evaluate(["6s", "7d", "8c", "9h", "Ts", "2c", "3d"]);
  assert.ok(compareEval(hi, lo) > 0);
});

test("two pair kicker tiebreak", () => {
  const a = evaluate(["As", "Ah", "Ks", "Kh", "Qd", "2c", "3d"]); // AAKK Q
  const b = evaluate(["As", "Ah", "Ks", "Kh", "Jd", "2c", "3d"]); // AAKK J
  assert.equal(a.category, HandCategory.TwoPair);
  assert.ok(compareEval(a, b) > 0);
});

test("pair vs high card", () => {
  const pair = evaluate(["8s", "8h", "Ks", "Qh", "2d", "3c", "4d"]);
  const high = evaluate(["As", "Kh", "Qs", "Jh", "9d", "3c", "2d"]);
  assert.ok(compareEval(pair, high) > 0);
});

test("identical hands tie", () => {
  const a = evaluate(["As", "Ks", "Qh", "Jd", "Tc", "2s", "3h"]);
  const b = evaluate(["Ad", "Kd", "Qc", "Js", "Th", "2s", "3h"]);
  assert.equal(compareEval(a, b), 0);
});
