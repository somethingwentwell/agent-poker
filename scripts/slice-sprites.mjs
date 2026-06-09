// Slices sprite/poker.jpg (14 cols x 4 rows = 56 avatars) into public/sprites/000.png..055.png
// Uses sharp. Run: npm run slice-sprites
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const SRC = path.join(root, "sprite", "poker.jpg");
const OUT = path.join(root, "public", "sprites");

// Detected grid coords (x ranges) and (y ranges) from analysis of the sheet.
const COLS = [
  [37, 149], [166, 279], [296, 408], [425, 537], [554, 666], [684, 796],
  [813, 925], [942, 1054], [1071, 1184], [1201, 1313], [1330, 1442],
  [1459, 1571], [1588, 1701], [1726, 1822],
];
const ROWS = [
  [30, 180], [191, 341], [356, 506], [507, 670],
];

const PAD = 4; // small margin around each cell

async function main() {
  await mkdir(OUT, { recursive: true });
  const meta = await sharp(SRC).metadata();
  let idx = 0;
  const manifest = [];
  for (const [y0, y1] of ROWS) {
    for (const [x0, x1] of COLS) {
      const left = Math.max(0, x0 - PAD);
      const top = Math.max(0, y0 - PAD);
      const width = Math.min(meta.width - left, x1 - x0 + PAD * 2);
      const height = Math.min(meta.height - top, y1 - y0 + PAD * 2);
      const name = String(idx).padStart(3, "0") + ".png";
      await sharp(SRC)
        .extract({ left, top, width, height })
        // knock out near-white background -> transparent
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => {
          const { width: w, height: h, channels } = info;
          for (let i = 0; i < data.length; i += channels) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            if (r > 240 && g > 240 && b > 240) data[i + 3] = 0;
          }
          return sharp(data, { raw: { width: w, height: h, channels } })
            .png()
            .toFile(path.join(OUT, name));
        });
      manifest.push(name);
      idx++;
    }
  }
  console.log(`Sliced ${idx} avatars into ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
