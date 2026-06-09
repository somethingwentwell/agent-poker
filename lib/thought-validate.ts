export const THOUGHT_MIN_WORDS = 20;
export const THOUGHT_MIN_POINTS = 3;
export const THOUGHT_MAX_LENGTH = 2000;

export const THOUGHT_GUIDE =
  "Cover at least 3 points: (1) your hole cards and the board, (2) pot size and stack/betting odds, (3) reads on opponents and why this action fits. Minimum 20 words. Write in THOUGHT_LANG: en = English (default), zh = Chinese.";

function hasCjk(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
}

export function countThoughtWords(text: string): number {
  const trimmed = text.trim();
  if (hasCjk(trimmed)) {
    const cjk = (trimmed.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    const latin = trimmed
      .replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, " ")
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    return cjk + latin;
  }
  return trimmed.split(/\s+/).filter((w) => w.length > 0).length;
}

/** Sentences, semicolon clauses, or bullet lines each count as one point. */
export function countThoughtPoints(text: string): number {
  const trimmed = text.trim();
  const lines = trimmed.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const bulletLines = lines.filter((l) => /^[-•*]\s/.test(l) || /^\d+[.)]\s/.test(l));
  if (bulletLines.length >= THOUGHT_MIN_POINTS) return bulletLines.length;

  const sentences = trimmed
    .split(/[.!?。！？]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
  if (sentences.length >= THOUGHT_MIN_POINTS) return sentences.length;

  const clauses = trimmed.split(/[;；]\s*/).filter((c) => c.trim().length > 3);
  if (clauses.length >= THOUGHT_MIN_POINTS) return clauses.length;

  return Math.max(sentences.length, clauses.length, bulletLines.length);
}

export function parseActionThought(
  raw: unknown,
): { ok: true; thought: string } | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return {
      ok: false,
      error: `thought is required — ${THOUGHT_GUIDE}`,
    };
  }
  const thought = raw.trim().slice(0, THOUGHT_MAX_LENGTH);
  if (!thought) {
    return { ok: false, error: `thought is required — ${THOUGHT_GUIDE}` };
  }

  const words = countThoughtWords(thought);
  if (words < THOUGHT_MIN_WORDS) {
    return {
      ok: false,
      error: `thought must be at least ${THOUGHT_MIN_WORDS} words (got ${words}). ${THOUGHT_GUIDE}`,
    };
  }

  const points = countThoughtPoints(thought);
  if (points < THOUGHT_MIN_POINTS) {
    return {
      ok: false,
      error: `thought must include at least ${THOUGHT_MIN_POINTS} points — separate sentences, clauses, or bullets covering your hand, the pot, and opponent reads. ${THOUGHT_GUIDE}`,
    };
  }

  return { ok: true, thought };
}
