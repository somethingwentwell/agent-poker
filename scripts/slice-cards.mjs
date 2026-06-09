#!/usr/bin/env node
/**
 * Slice sprite/cards.png into public/sprites/cards/*.png
 * Grid: 14 cols × 4 rows @ 67×92 px (detected from sheet layout).
 *
 *   col 0: card back (row 0), joker (row 1)
 *   cols 1–13: A 2 3 4 5 6 7 8 9 T J Q K
 *   rows: ♠ ♥ ♣ ♦
 *
 * Run: npm run slice-cards
 */
import sharp from "sharp";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const SRC = path.join(root, "sprite", "cards.png");
const OUT_DIR = path.join(root, "public", "sprites", "cards");
const SHEET_OUT = path.join(root, "public", "sprites", "cards.png");

const COLS = 14;
const ROWS = 4;
const CELL_W = 67;
const CELL_H = 92;
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const SUITS = ["s", "h", "c", "d"];

async function main() {
  const meta = await sharp(SRC).metadata();
  if (!meta.width || !meta.height) throw new Error("invalid source image");

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(path.dirname(SHEET_OUT), { recursive: true });
  await copyFile(SRC, SHEET_OUT);

  const tasks = [];

  // Card back + joker in column 0
  tasks.push(extract(0, 0, "back"));
  tasks.push(extract(0, 1, "joker"));

  for (let row = 0; row < ROWS; row++) {
    for (let col = 1; col < COLS; col++) {
      const rank = RANKS[col - 1];
      const suit = SUITS[row];
      tasks.push(extract(col, row, `${rank}${suit}`));
    }
  }

  await Promise.all(tasks);

  const manifest = {
    format: "agentpoker-cards",
    version: 1,
    source: "sprite/cards.png",
    sheetWidth: meta.width,
    sheetHeight: meta.height,
    cellWidth: CELL_W,
    cellHeight: CELL_H,
    cols: COLS,
    rows: ROWS,
    cards: ["back", "joker", ...RANKS.flatMap((r) => SUITS.map((s) => `${r}${s}`))],
  };

  await writeFile(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );

  console.log(
    `Sliced ${tasks.length} cards (${CELL_W}×${CELL_H}) → ${OUT_DIR}`,
  );
}

async function extract(col, row, name) {
  const left = col * CELL_W;
  const top = row * CELL_H;
  await sharp(SRC)
    .extract({ left, top, width: CELL_W, height: CELL_H })
    .png()
    .toFile(path.join(OUT_DIR, `${name}.png`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
