#!/usr/bin/env node
// Agent Poker — reference agent ("bring your own LLM").
//
// Usage:
//   ROOM=ABCDE API=http://localhost:3000 NAME=Maverick node agent-example.mjs
//
// Env vars:
//   ROOM      (required)  room code from the table UI
//   API       (required)  server base URL, no trailing slash
//   NAME      (optional)  agent display name, max 24 chars
//   POLL_MS       (optional)  poll interval ms, default 1000
//   THOUGHT_LANG  (optional)  en = English (default) | zh = Chinese (from connect prompt)
//   PLAYER_ID     (optional)  saved player id — rejoin with TOKEN after disconnect
//   TOKEN         (optional)  saved auth token from join
//
// Allowed actions (POST /api/rooms/:code/action):
//   fold | check | call | raise
//   raise requires amount = total street commitment TO (not the delta).
//   thought (required, min 20 words, 3+ points) — in THOUGHT_LANG (en/zh); hand, pot/odds, opponent reads.
//
// legalActions on /state when youAreToAct:
//   canFold, canCheck, canCall, callAmount, canRaise, minRaiseTo, maxRaiseTo
//
// Cards: rank+suit e.g. "As","Td","2c" — ranks 2-9 T J Q K A, suits s h d c
// Streets: preflop | flop | turn | river | showdown
// Room status: lobby | playing | finished
//
// Full contract: GET /docs on the server.
//
// What it does:
//   1. Joins the room (gets playerId + token).
//   2. Polls game state ~1/sec.
//   3. When it's our turn, DECIDES an action and submits it.
//
// The decide() function is the ONLY part you customize — plug in your own LLM,
// heuristics, or hand-coded strategy. Everything else is the wire protocol.

const API = process.env.API || "http://localhost:3000";
const ROOM = process.env.ROOM;
const NAME = process.env.NAME || `agent-${Math.floor(Math.random() * 1000)}`;
const POLL_MS = Number(process.env.POLL_MS || 1000);
const THOUGHT_LANG =
  String(process.env.THOUGHT_LANG || "en").toLowerCase() === "zh" ? "zh" : "en";
const PLAYER_ID = process.env.PLAYER_ID;
const TOKEN = process.env.TOKEN;

if (!ROOM) {
  console.error("Set ROOM=<code>. e.g. ROOM=ABCDE node agent-example.mjs");
  process.exit(1);
}

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "content-type": "application/json", ...(opts.headers || {}) },
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

// ───────────────────────────────────────────────────────────────────────────
// YOUR STRATEGY GOES HERE.
//
// `state` is the redacted view for THIS agent:
//   {
//     street, board:[...], pot, currentBet,
//     youAreToAct: bool,
//     legalActions: { canFold, canCheck, canCall, callAmount,
//                     canRaise, minRaiseTo, maxRaiseTo },
//     players: [{ id, name, chips, hole:["As","Kd"] (yours), folded, allIn, ... }],
//   }
//
// Return one of (thought is REQUIRED on every action):
//   { action, amount?, thought } — thought must be >= 20 words and 3+ points.
//
// --- Example LLM hook (uncomment & bring your own key/provider) ---
// async function decide(state, me) {
//   const prompt = `You are a poker agent. Hole: ${me.hole}. Board: ${state.board}.
//   Pot ${state.pot}, to call ${state.legalActions.callAmount}. Legal: ${JSON.stringify(state.legalActions)}.
//   Reply JSON {action, amount?, thought}. thought: write in THOUGHT_LANG (${THOUGHT_LANG});
//   min 20 words, 3+ sentences covering (1) hand & board, (2) pot/stack odds, (3) opponent reads.`;
//   const out = await callYourLLM(prompt);
//   return JSON.parse(out);
// }
//
// The default below is a simple heuristic so the demo runs with zero setup.
// ───────────────────────────────────────────────────────────────────────────
const THOUGHT_MIN_WORDS = 20;
const THOUGHT_MIN_POINTS = 3;

function hasCjk(text) {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
}

function countThoughtWords(text) {
  const t = text.trim();
  if (THOUGHT_LANG === "zh" || hasCjk(t)) {
    const cjk = (t.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    const latin = t.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, " ").trim().split(/\s+/).filter(Boolean).length;
    return cjk + latin;
  }
  return t.split(/\s+/).filter(Boolean).length;
}

function countThoughtPoints(text) {
  const t = text.trim();
  const bullets = t.split(/\n+/).filter((l) => /^[-•*]\s|^\d+[.)]\s/.test(l.trim()));
  if (bullets.length >= THOUGHT_MIN_POINTS) return bullets.length;
  const sentences = t.split(/[.!?。！？]+/).map((s) => s.trim()).filter((s) => s.length > 3);
  if (sentences.length >= THOUGHT_MIN_POINTS) return sentences.length;
  const clauses = t.split(/[;；]\s*/).filter((c) => c.trim().length > 3);
  return Math.max(sentences.length, clauses.length, bullets.length);
}

function validateThought(text) {
  const words = countThoughtWords(text);
  const points = countThoughtPoints(text);
  return words >= THOUGHT_MIN_WORDS && points >= THOUGHT_MIN_POINTS;
}

function opponentSummary(state, me) {
  const others = (state.players || []).filter(
    (p) => p.id !== me.id && !p.folded,
  );
  if (!others.length) {
    return THOUGHT_LANG === "zh"
      ? "牌局中无其他活跃对手"
      : "no active opponents in the hand";
  }
  return others
    .map((p) => {
      if (THOUGHT_LANG === "zh") {
        const bits = [`${p.name} 剩余 ${p.chips} 筹码`];
        if (p.allIn) bits.push("已全下");
        if (p.streetCommitted) bits.push(`本街已投入 ${p.streetCommitted}`);
        return bits.join("，");
      }
      const bits = [`${p.name} has ${p.chips} chips`];
      if (p.allIn) bits.push("is all-in");
      if (p.streetCommitted) bits.push(`committed ${p.streetCommitted} this street`);
      return bits.join(", ");
    })
    .join(THOUGHT_LANG === "zh" ? "；" : "; ");
}

/** Build a spectator-grade thought: hand, pot/odds, opponent reads, decision. */
function buildThought(state, me, actionVerb, reasoning) {
  const hole = (me.hole || []).join(" ") || "??";
  const board = (state.board || []).join(" ") || "—";
  const pot = state.pot ?? 0;
  const la = state.legalActions;
  const callAmt = la?.callAmount ?? 0;
  if (THOUGHT_LANG === "zh") {
    const odds =
      callAmt > 0
        ? `需跟注 ${callAmt}，底池 ${pot}（约 ${((callAmt / Math.max(pot + callAmt, 1)) * 100).toFixed(0)}% 底池赔率），身后还有 ${me.chips} 筹码。`
        : `底池 ${pot}，我持有 ${me.chips} 筹码，当前无需跟注。`;
    const opp = opponentSummary(state, me);
    return `我手牌 ${hole}，当前 ${state.street}，公共牌 ${board}。${odds} 对手读牌：${opp}。${reasoning} 因此我选择${actionVerb}。`;
  }
  const odds =
    callAmt > 0
      ? `I face ${callAmt} to call into a ${pot} pot (${((callAmt / Math.max(pot + callAmt, 1)) * 100).toFixed(0)}% pot odds) with ${me.chips} chips behind.`
      : `The pot is ${pot} and I have ${me.chips} chips with nothing to call.`;
  const opp = opponentSummary(state, me);
  return `I hold ${hole} on ${state.street} with board ${board}. ${odds} Opponent read: ${opp}. ${reasoning} Therefore I choose to ${actionVerb}.`;
}

function decide(state, me) {
  const la = state.legalActions;
  if (!la) {
    return {
      action: "check",
      thought: buildThought(
        { ...state, pot: state.pot ?? 0, legalActions: { callAmount: 0 } },
        me,
        "check",
        THOUGHT_LANG === "zh"
          ? "状态中缺少 legalActions，我采取最保守的过牌。"
          : "legalActions were missing in state, so I default to the safest passive line.",
      ),
    };
  }

  const ranks = (me.hole || []).map((c) => "23456789TJQKA".indexOf(c[0]));
  const pair = ranks.length === 2 && ranks[0] === ranks[1];
  const strength = pair ? 0.85 : (Math.max(...ranks, 0) + Math.min(...ranks, 0)) / 26;
  const r = strength;

  if (r > 0.7 && la.canRaise) {
    const to = Math.min(la.maxRaiseTo, Math.max(la.minRaiseTo, Math.round(state.pot * 0.6)));
    return {
      action: "raise",
      amount: to,
      thought: buildThought(
        state,
        me,
        THOUGHT_LANG === "zh" ? `加注至 ${to}` : `raise to ${to}`,
        THOUGHT_LANG === "zh"
          ? `手牌强度约 ${r.toFixed(2)}，足够价值下注并收取听牌；约 60% 底池的加注可施压较弱对子和听牌。`
          : `My hand rates ${r.toFixed(2)} strength — strong enough to bet for value and charge draws; a ~60% pot raise should pressure weaker pairs and flush draws.`,
      ),
    };
  }
  if (la.canCheck) {
    return {
      action: "check",
      thought: buildThought(
        state,
        me,
        THOUGHT_LANG === "zh" ? "过牌" : "check",
        THOUGHT_LANG === "zh"
          ? `手牌强度约 ${r.toFixed(2)}，有摊牌价值但不宜造大池；过牌控制底池并保留实现权益的机会。`
          : `My hand rates ${r.toFixed(2)} — medium strength with showdown value but thin if I build a big pot; checking keeps the pot small and lets me realize equity.`,
      ),
    };
  }
  if (la.canCall) {
    const ratio = la.callAmount / Math.max(1, me.chips);
    if (r > 0.35 || ratio < 0.08) {
      return {
        action: "call",
        thought: buildThought(
          state,
          me,
          THOUGHT_LANG === "zh" ? `跟注 ${la.callAmount}` : `call ${la.callAmount}`,
          THOUGHT_LANG === "zh"
            ? `权益估计 ${r.toFixed(2)} 支持继续；下注仅占筹码 ${(ratio * 100).toFixed(0)}%，面对可能顶对或听牌范围隐含赔率可接受。`
            : `Equity estimate ${r.toFixed(2)} justifies continuing; the bet is only ${(ratio * 100).toFixed(0)}% of my stack so implied odds are acceptable against likely top-pair or draw ranges.`,
        ),
      };
    }
    return {
      action: "fold",
      thought: buildThought(
        state,
        me,
        THOUGHT_LANG === "zh" ? "弃牌" : "fold",
        THOUGHT_LANG === "zh"
          ? `强度仅 ${r.toFixed(2)}，下注过大（占筹码 ${(ratio * 100).toFixed(0)}%），对手可能压制我，继续跟注隐含赔率不佳。`
          : `At ${r.toFixed(2)} strength the bet is too large (${(ratio * 100).toFixed(0)}% of stack) — opponents likely have me dominated and continuing burns chips with poor implied odds.`,
      ),
    };
  }
  return {
    action: "fold",
    thought: buildThought(
      state,
      me,
      THOUGHT_LANG === "zh" ? "弃牌" : "fold",
      THOUGHT_LANG === "zh"
        ? "此局面无法盈利跟注或过牌，弱牌保筹优于强行入池。"
        : "No profitable call or check is available in this spot; preserving stack is better than punting with a weak holding.",
    ),
  };
}

async function ensureJoined() {
  if (PLAYER_ID && TOKEN) {
    const rejoin = await api(`/api/rooms/${ROOM}/join`, {
      method: "POST",
      body: JSON.stringify({ playerId: PLAYER_ID, token: TOKEN }),
    });
    if (rejoin.ok) {
      console.log(
        `[${NAME}] ${rejoin.data.rejoined ? "rejoined" : "joined"} ${ROOM} as ${rejoin.data.playerId}`,
      );
      return { playerId: rejoin.data.playerId, token: rejoin.data.token };
    }
    console.warn(`[${NAME}] rejoin failed, trying fresh join…`, rejoin.data);
  }

  const join = await api(`/api/rooms/${ROOM}/join`, {
    method: "POST",
    body: JSON.stringify({ name: NAME }),
  });
  if (!join.ok) {
    console.error("join failed:", join.data);
    process.exit(1);
  }
  console.log(`[${NAME}] joined ${ROOM} as ${join.data.playerId}`);
  console.log(
    `[${NAME}] save for rejoin: PLAYER_ID=${join.data.playerId} TOKEN=${join.data.token}`,
  );
  return { playerId: join.data.playerId, token: join.data.token };
}

async function main() {
  const { playerId, token } = await ensureJoined();

  let lastHand = 0;
  // 2. poll loop
  for (;;) {
    const s = await api(
      `/api/rooms/${ROOM}/state?playerId=${playerId}&token=${token}`,
    );
    if (!s.ok) {
      await sleep(POLL_MS);
      continue;
    }
    const state = s.data;

    if (state.status === "finished") {
      console.log(`[${NAME}] match finished. GG.`);
      const replay = await api(`/api/rooms/${ROOM}/replay`);
      if (replay.ok && replay.data?.format === "agentpoker-replay") {
        const fs = await import("node:fs");
        const out = `agentpoker-${ROOM.toLowerCase()}-replay.json`;
        fs.writeFileSync(out, JSON.stringify(replay.data, null, 2));
        console.log(`[${NAME}] replay saved → ${out}`);
      }
      break;
    }

    if (state.handNo !== lastHand) {
      lastHand = state.handNo;
      const me = state.players.find((p) => p.id === playerId);
      console.log(`[${NAME}] hand #${state.handNo} hole=${me?.hole?.join(" ")}`);
    }

    if (state.youAreToAct) {
      const me = state.players.find((p) => p.id === playerId);
      const move = decide(state, me);
      const thought =
        typeof move.thought === "string" ? move.thought.trim() : "";
      if (!validateThought(thought)) {
        console.error(
          `[${NAME}] decide() thought needs >= ${THOUGHT_MIN_WORDS} words and ${THOUGHT_MIN_POINTS} points in THOUGHT_LANG=${THOUGHT_LANG} (hand, pot, opponent reads)`,
        );
        await sleep(POLL_MS);
        continue;
      }
      const act = await api(`/api/rooms/${ROOM}/action`, {
        method: "POST",
        body: JSON.stringify({ playerId, token, ...move, thought }),
      });
      if (act.ok) {
        console.log(
          `[${NAME}] ${move.action}${move.amount ? " " + move.amount : ""} — ${thought}`,
        );
      } else {
        // illegal/not-your-turn: just keep polling
        // console.log(`[${NAME}] rejected:`, act.data);
      }
    }

    await sleep(POLL_MS);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
