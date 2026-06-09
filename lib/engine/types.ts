// Core types for the Hold'em engine and rooms.

export type Suit = "s" | "h" | "d" | "c";
export type Rank =
  | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A";

// A card is encoded as e.g. "As", "Td", "2c".
export type Card = string;

export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";

export type ActionType = "fold" | "check" | "call" | "raise" | "allin" | "blind";

export interface Player {
  id: string;
  name: string;
  token: string;
  avatar: number;
  chips: number;
  isHost: boolean;
  connected: boolean;
  lastSeen: number;
  // per-hand fields:
  hole: Card[];
  folded: boolean;
  allIn: boolean;
  committed: number; // chips put into pot this hand
  streetCommitted: number; // chips put in during current street
  hasActed: boolean; // acted at least once this street
  sittingOut: boolean; // out of chips
}

export interface ActionRecord {
  handNo: number;
  street: Street;
  playerId: string | null; // null for system events (deal, etc.)
  type: ActionType | "deal" | "win" | "post";
  amount?: number;
  // snapshot for replay:
  board: Card[];
  pot: number;
  stacks: Record<string, number>; // playerId -> chips remaining at this moment
  streetCommitted: Record<string, number>; // playerId -> chips in this street
  note?: string;
  /** Why the agent chose this action (required on submit; shown in God's eye view). */
  thought?: string;
  /** Wall-clock ms when this record was written (for chat timestamps). */
  ts?: number;
}

export interface HandResult {
  handNo: number;
  board: Card[];
  winners: { playerId: string; amount: number; handName?: string }[];
  // reveal everyone's hole cards at showdown for replay
  reveal: { playerId: string; hole: Card[] }[];
}

export type RoomStatus = "lobby" | "playing" | "finished";

export interface GameState {
  handNo: number;
  street: Street;
  deck: Card[];
  board: Card[];
  pot: number;
  // index into seat order of the player to act
  toAct: number | null;
  buttonSeat: number;
  // amount required to match on current street
  currentBet: number;
  // size of last raise (for min-raise enforcement)
  lastRaiseSize: number;
  // seat order: list of player ids in seating order
  seats: string[];
  smallBlind: number;
  bigBlind: number;
  // whether the betting round is complete and we should advance
  handOver: boolean;
}

export interface Room {
  code: string;
  status: RoomStatus;
  /** Secret for the browser that created the room — start match only, not a seat. */
  hostToken: string;
  players: Player[];
  game: GameState | null;
  history: ActionRecord[];
  results: HandResult[];
  seed: number;
  rngState: number;
  createdAt: number;
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
  maxHands: number; // stop match after this many hands (0 = until one player left)
  lastHandEndedAt?: number; // ms timestamp when current hand ended (for auto-advance grace)
}

export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canRaise: boolean;
  minRaiseTo: number;
  maxRaiseTo: number; // all-in cap
}
