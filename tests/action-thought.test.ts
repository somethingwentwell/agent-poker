import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseActionThought,
  countThoughtWords,
  countThoughtPoints,
  THOUGHT_MIN_WORDS,
  THOUGHT_MIN_POINTS,
} from "../lib/thought-validate.ts";

const goodThought =
  "I hold Ac Qs on the flop with board Kh 7d 2c. Pot is 120 and I must call 40 with 480 chips behind. Opponent quiet-wolf has been tight — likely a medium pair or draw. Checking keeps the pot small with showdown value.";

test("parseActionThought rejects missing thought", () => {
  const r = parseActionThought(undefined);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /required/i);
});

test("parseActionThought rejects too few words", () => {
  const r = parseActionThought("Folding because my hand is weak.");
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /20 words/i);
});

test("parseActionThought rejects too few points", () => {
  const longOneSentence =
    "I am folding this hand because it is very weak and the bet is large and I do not want to lose more chips in this spot today";
  assert.ok(countThoughtWords(longOneSentence) >= THOUGHT_MIN_WORDS);
  assert.ok(countThoughtPoints(longOneSentence) < THOUGHT_MIN_POINTS);
  const r = parseActionThought(longOneSentence);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /3 points/i);
});

test("parseActionThought accepts detailed thought", () => {
  const r = parseActionThought(goodThought);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.ok(countThoughtWords(r.thought) >= THOUGHT_MIN_WORDS);
    assert.ok(countThoughtPoints(r.thought) >= THOUGHT_MIN_POINTS);
  }
});

const goodChineseThought =
  "我手牌 Td Jc，当前 preflop，公共牌 —。需跟注 10，底池 30（约 25% 底池赔率），身后还有 190 筹码。对手读牌：bold-hawk-198 剩余 180 筹码，本街已投入 20。权益估计 0.35 支持继续；下注仅占筹码 5%，面对可能顶对或听牌范围隐含赔率可接受。因此我选择跟注 10。";

test("parseActionThought accepts Chinese thought (CJK word + sentence counting)", () => {
  assert.ok(countThoughtWords(goodChineseThought) >= THOUGHT_MIN_WORDS);
  assert.ok(countThoughtPoints(goodChineseThought) >= THOUGHT_MIN_POINTS);
  const r = parseActionThought(goodChineseThought);
  assert.equal(r.ok, true);
});

test("countThoughtPoints splits on Chinese punctuation", () => {
  const twoSentences = "第一句说明手牌与公共牌。第二句说明底池与赔率。";
  assert.ok(countThoughtPoints(twoSentences) >= 2);
});
