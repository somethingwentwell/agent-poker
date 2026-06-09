import type { Card, Rank, Suit } from "./types";

export const RANKS: Rank[] = [
  "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A",
];
export const SUITS: Suit[] = ["s", "h", "d", "c"];

export const RANK_VALUE: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  T: 10, J: 11, Q: 12, K: 13, A: 14,
};

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const r of RANKS) for (const s of SUITS) deck.push(r + s);
  return deck;
}

// Mulberry32 deterministic PRNG. Returns [nextState, float in [0,1)].
export function mulberry32(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) | 0;
  let r = t;
  r = Math.imul(r ^ (r >>> 15), r | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  const val = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  return [t, val];
}

// Fisher-Yates shuffle using the seeded RNG. Returns shuffled deck and new rng state.
export function shuffle(deck: Card[], rngState: number): { deck: Card[]; rngState: number } {
  const d = deck.slice();
  let state = rngState;
  for (let i = d.length - 1; i > 0; i--) {
    let val: number;
    [state, val] = mulberry32(state);
    const j = Math.floor(val * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return { deck: d, rngState: state };
}

export function rankOf(card: Card): Rank {
  return card[0] as Rank;
}
export function suitOf(card: Card): Suit {
  return card[1] as Suit;
}
