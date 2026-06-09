import { CATEGORY_NAME } from "./engine/evaluator";
import { RANKS, SUITS } from "./engine/cards";

/** Single source of truth for allowed API values — used by docs + connect prompt. */

export const ROOM_STATUSES = ["lobby", "playing", "finished"] as const;
export const STREETS = ["preflop", "flop", "turn", "river", "showdown"] as const;
export const PLAYER_ACTIONS = ["fold", "check", "call", "raise"] as const;
export const HISTORY_ACTION_TYPES = [
  "fold",
  "check",
  "call",
  "raise",
  "allin",
  "blind",
  "deal",
  "win",
  "post",
] as const;

export const CARD_RANKS = RANKS;
export const CARD_SUITS = SUITS;
export const CARD_FORMAT = 'rank + suit, e.g. "As", "Td", "2c" (hidden = "??")';
export const SUIT_NAMES: Record<string, string> = {
  s: "spades ♠",
  h: "hearts ♥",
  d: "diamonds ♦",
  c: "clubs ♣",
};

export const HAND_NAMES = Object.values(CATEGORY_NAME);

export const LIMITS = {
  maxPlayersPerRoom: 10,
  minPlayersToStart: 2,
  playerNameMaxLength: 24,
  roomCodeLength: 5,
  avatarIds: "0–55 (face emoji)",
  defaultStartingChips: 500,
  defaultSmallBlind: 10,
  defaultBigBlind: 20,
  maxHandsDefault: 0,
  maxHandsNote: "0 = play until one player has chips",
  pollIntervalMs: 1000,
  handAdvanceGraceMs: 2500,
  thoughtMaxLength: 2000,
  thoughtMinWords: 20,
  thoughtMinPoints: 3,
} as const;

export {
  parseActionThought,
  THOUGHT_GUIDE,
  THOUGHT_MIN_POINTS,
  THOUGHT_MIN_WORDS,
} from "./thought-validate";

export const AGENT_ENV = [
  {
    name: "ROOM",
    required: true,
    example: "ABCDE",
    description: "5-character room code (from the table UI).",
  },
  {
    name: "API",
    required: true,
    example: "http://localhost:3000",
    description: "Server base URL (no trailing slash). Copy from the room page or set NEXT_PUBLIC_APP_URL.",
  },
  {
    name: "NAME",
    required: false,
    example: "Maverick",
    description: "Display name for your agent (max 24 chars). Defaults to agent-<random>.",
  },
  {
    name: "POLL_MS",
    required: false,
    example: "1000",
    description: "Milliseconds between /state polls. Default 1000.",
  },
  {
    name: "PLAYER_ID",
    required: false,
    example: "p_abc123",
    description: "Saved player id — use with TOKEN to rejoin after disconnect.",
  },
  {
    name: "TOKEN",
    required: false,
    example: "…",
    description: "Saved auth token from join — use with PLAYER_ID to rejoin.",
  },
  {
    name: "THOUGHT_LANG",
    required: false,
    example: "en",
    description:
      "Language for action thoughts (Why this action): en = English (default), zh = Chinese. Copied from the room connect prompt.",
  },
] as const;

export const CREATE_ROOM_FIELDS = [
  { field: "startingChips", type: "number", required: false, default: "500", note: "Chips per player at match start" },
  { field: "smallBlind", type: "number", required: false, default: "10", note: "Small blind amount" },
  { field: "bigBlind", type: "number", required: false, default: "20", note: "Big blind amount" },
  { field: "maxHands", type: "number", required: false, default: "0", note: "Stop after N hands; 0 = until one winner" },
] as const;

export const JOIN_FIELDS = [
  { field: "name", type: "string", required: false, default: 'agent-N', note: "Agent name for first join (lobby only), max 24 characters" },
  { field: "playerId", type: "string", required: false, note: "With token: rejoin an existing seat (works during play)" },
  { field: "token", type: "string", required: false, note: "With playerId: rejoin an existing seat" },
] as const;

export const START_FIELDS = [
  { field: "hostToken", type: "string", required: true, note: "From POST /api/rooms response (browser only, not a player seat)" },
] as const;

export const ACTION_FIELDS = [
  { field: "playerId", type: "string", required: true, note: "Your player id" },
  { field: "token", type: "string", required: true, note: "Your auth token" },
  { field: "action", type: "enum", required: true, allowed: [...PLAYER_ACTIONS], note: "One of the four player moves" },
  { field: "amount", type: "number", required: false, note: "Required for raise: total street commitment TO (not the delta)" },
  {
    field: "thought",
    type: "string",
    required: true,
    note: "Required: detailed why in THOUGHT_LANG (en or zh); min 20 words, 3+ points: hand/board, pot/odds, opponent reads. Max 2000 chars. Shown in God's eye view",
  },
] as const;

export const LEGAL_ACTIONS_FIELDS = [
  { field: "canFold", type: "boolean", note: "Always true when it is your turn" },
  { field: "canCheck", type: "boolean", note: "True when no bet to match" },
  { field: "canCall", type: "boolean", note: "True when facing a bet" },
  { field: "callAmount", type: "number", note: "Chips needed to call (may be less than full bet if short-stacked)" },
  { field: "canRaise", type: "boolean", note: "True if you have chips beyond the call" },
  { field: "minRaiseTo", type: "number", note: "Minimum total street commitment for a legal raise" },
  { field: "maxRaiseTo", type: "number", note: "Maximum raise TO (all-in cap)" },
] as const;

export const STATE_QUERY = [
  { param: "playerId", required: false, note: "Omit for spectator-only view" },
  { param: "token", required: false, note: "Required with playerId for authenticated view + legalActions" },
] as const;

export const HTTP_ERRORS = [
  { status: 400, when: "Invalid action type, need ≥2 players to start" },
  { status: 403, when: "Bad playerId/token, or non-host calling /start" },
  { status: 404, when: "Room not found" },
  { status: 409, when: "Not your turn, illegal move, room full, game already started, match in progress" },
] as const;

export const AGENT_LOOP = [
  "POST /api/rooms/:code/join → save playerId + token (rejoin with same body after disconnect)",
  "Poll GET /api/rooms/:code/state?playerId=&token= every POLL_MS",
  "When youAreToAct is true, read legalActions and POST /api/rooms/:code/action",
  "On 409 from /action, keep polling (not your turn or illegal — retry next tick)",
  "When status is finished, exit the loop",
] as const;
