import type { Card } from "./types";
import { RANK_VALUE, rankOf, suitOf } from "./cards";

// Hand categories (higher = better)
export enum HandCategory {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  Trips = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  Quads = 7,
  StraightFlush = 8,
}

export const CATEGORY_NAME: Record<HandCategory, string> = {
  [HandCategory.HighCard]: "High Card",
  [HandCategory.Pair]: "Pair",
  [HandCategory.TwoPair]: "Two Pair",
  [HandCategory.Trips]: "Three of a Kind",
  [HandCategory.Straight]: "Straight",
  [HandCategory.Flush]: "Flush",
  [HandCategory.FullHouse]: "Full House",
  [HandCategory.Quads]: "Four of a Kind",
  [HandCategory.StraightFlush]: "Straight Flush",
};

export interface EvalResult {
  category: HandCategory;
  // tiebreak: ordered ranks, e.g. [pairRank, kicker1, kicker2, kicker3]
  tiebreak: number[];
  // single comparable score (higher = better)
  score: number;
  name: string;
}

function score(category: HandCategory, tiebreak: number[]): number {
  // base 15 to leave room for ace-high = 14
  let s = category;
  for (let i = 0; i < 5; i++) {
    s = s * 15 + (tiebreak[i] ?? 0);
  }
  return s;
}

// Detect best straight high card from a set of distinct rank values. Handles wheel (A-2-3-4-5).
function straightHigh(distinct: number[]): number | null {
  const set = new Set(distinct);
  // Ace can be low
  const ranks = [...set].sort((a, b) => b - a);
  if (set.has(14)) ranks.push(1);
  let run = 1;
  for (let i = 0; i < ranks.length - 1; i++) {
    if (ranks[i] - 1 === ranks[i + 1]) {
      run++;
      if (run >= 5) return ranks[i - 3];
    } else if (ranks[i] !== ranks[i + 1]) {
      run = 1;
    }
  }
  return null;
}

// Evaluate exactly the best 5-card hand out of the given 5-7 cards.
export function evaluate(cards: Card[]): EvalResult {
  const values = cards.map((c) => RANK_VALUE[rankOf(c)]);
  const suits = cards.map((c) => suitOf(c));

  // counts by rank
  const countByRank = new Map<number, number>();
  for (const v of values) countByRank.set(v, (countByRank.get(v) ?? 0) + 1);

  // group ranks by count, sorted by (count desc, rank desc)
  const grouped = [...countByRank.entries()].sort((a, b) =>
    b[1] - a[1] || b[0] - a[0]
  );

  // flush detection
  const suitGroups = new Map<string, number[]>();
  cards.forEach((c) => {
    const s = suitOf(c);
    const arr = suitGroups.get(s) ?? [];
    arr.push(RANK_VALUE[rankOf(c)]);
    suitGroups.set(s, arr);
  });
  let flushSuit: string | null = null;
  for (const [s, arr] of suitGroups) if (arr.length >= 5) flushSuit = s;

  // straight flush
  if (flushSuit) {
    const fvals = suitGroups.get(flushSuit)!;
    const sfHigh = straightHigh([...new Set(fvals)]);
    if (sfHigh) {
      return mk(HandCategory.StraightFlush, [sfHigh]);
    }
  }

  // quads
  if (grouped[0][1] === 4) {
    const quad = grouped[0][0];
    const kicker = Math.max(...values.filter((v) => v !== quad));
    return mk(HandCategory.Quads, [quad, kicker]);
  }

  // full house (trips + pair, or trips + trips)
  if (grouped[0][1] === 3) {
    const trips = grouped[0][0];
    // find best pair among the rest
    const pair = grouped.find((g, i) => i > 0 && g[1] >= 2);
    if (pair) return mk(HandCategory.FullHouse, [trips, pair[0]]);
  }

  // flush
  if (flushSuit) {
    const top5 = suitGroups.get(flushSuit)!.sort((a, b) => b - a).slice(0, 5);
    return mk(HandCategory.Flush, top5);
  }

  // straight
  const sHigh = straightHigh([...new Set(values)]);
  if (sHigh) return mk(HandCategory.Straight, [sHigh]);

  // trips
  if (grouped[0][1] === 3) {
    const trips = grouped[0][0];
    const kickers = values
      .filter((v) => v !== trips)
      .sort((a, b) => b - a)
      .slice(0, 2);
    return mk(HandCategory.Trips, [trips, ...kickers]);
  }

  // two pair / pair
  const pairs = grouped.filter((g) => g[1] === 2).map((g) => g[0]).sort((a, b) => b - a);
  if (pairs.length >= 2) {
    const [p1, p2] = pairs;
    const kicker = Math.max(...values.filter((v) => v !== p1 && v !== p2));
    return mk(HandCategory.TwoPair, [p1, p2, kicker]);
  }
  if (pairs.length === 1) {
    const p = pairs[0];
    const kickers = values.filter((v) => v !== p).sort((a, b) => b - a).slice(0, 3);
    return mk(HandCategory.Pair, [p, ...kickers]);
  }

  // high card
  const top5 = [...values].sort((a, b) => b - a).slice(0, 5);
  return mk(HandCategory.HighCard, top5);

  function mk(category: HandCategory, tiebreak: number[]): EvalResult {
    const tb = tiebreak.slice(0, 5);
    return {
      category,
      tiebreak: tb,
      score: score(category, tb),
      name: CATEGORY_NAME[category],
    };
  }
}

// Compare two evaluations: positive if a beats b, 0 if tie.
export function compareEval(a: EvalResult, b: EvalResult): number {
  return a.score - b.score;
}
