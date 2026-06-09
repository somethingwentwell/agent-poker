import type { CSSProperties } from "react";

/** Card sprites sliced from sprite/cards.png — see scripts/slice-cards.mjs */

export const CARD_CELL_W = 67;
export const CARD_CELL_H = 92;
export const CARD_ASPECT = CARD_CELL_W / CARD_CELL_H;

const RANK_COL: Record<string, number> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
};

const SUIT_ROW: Record<string, number> = {
  s: 0,
  h: 1,
  c: 2,
  d: 3,
};

/** Normalize engine card code e.g. "as" → "As", "??" → back */
export function normalizeCardCode(card: string): string | "back" {
  if (!card || card === "??") return "back";
  const rank = card[0]?.toUpperCase();
  const suit = card[1]?.toLowerCase();
  if (!rank || !suit || RANK_COL[rank] === undefined || SUIT_ROW[suit] === undefined) {
    return "back";
  }
  return `${rank}${suit}`;
}

/** Path to a sliced card PNG under /public/sprites/cards/ */
export function cardImageSrc(card: string): string {
  const code = normalizeCardCode(card);
  return `/sprites/cards/${code}.png`;
}

/** CSS sprite fallback (full sheet at /sprites/cards.png) */
export function cardSpriteStyle(card: string): CSSProperties {
  const code = normalizeCardCode(card);
  let col = 0;
  let row = 0;
  if (code !== "back") {
    col = RANK_COL[code[0]] ?? 1;
    row = SUIT_ROW[code[1]] ?? 0;
  }
  return {
    backgroundImage: "url(/sprites/cards.png)",
    backgroundSize: `${CARD_CELL_W * 14}px ${CARD_CELL_H * 4}px`,
    backgroundPosition: `-${col * CARD_CELL_W}px -${row * CARD_CELL_H}px`,
    backgroundRepeat: "no-repeat",
    imageRendering: "pixelated",
  };
}
