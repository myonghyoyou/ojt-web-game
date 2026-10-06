export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;
export const TOTAL_ROUNDS = 7;
export const NAME_MAX = 6;
export const REASON_MAX = 20;
export const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
export const REACTION_KINDS = ['lol', 'agree', 'unfair'] as const;

export type ReactionKind = (typeof REACTION_KINDS)[number];
export type Phase = 'lobby' | 'voting' | 'reveal' | 'final';
export type PlayerStatus = 'active' | 'pending' | 'removed';
export type ResultType = 'unanimous' | 'tie' | 'normal' | 'scattered';
export type PredictionKind = 'under' | 'over' | 'exact';
/** Returns a number in [0, 1). Injected so tests are deterministic. */
export type Rng = () => number;

export interface Player {
  id: string;
  name: string;
  token: string;
  status: PlayerStatus;
  connected: boolean;
  /** 0-based round index from which this player votes and can be voted for. -1 while pending. */
  joinedRound: number;
}

/** A reason never records who wrote it. */
export interface Reason {
  id: string;
  targetId: string;
  text: string;
  hidden: boolean;
}

export interface PredictionHighlight {
  playerId: string;
  predicted: number;
  actual: number;
  kind: PredictionKind;
  comment: string;
}

export interface RoundResult {
  topIds: string[];
  type: ResultType;
  comment: string;
  prediction: PredictionHighlight | null;
}

/** Who voted (votedIds) and who received votes (votes) are stored separately on purpose. */
export interface Round {
  questionId: string;
  eligibleIds: string[];
  votes: Record<string, number>;
  votedIds: string[];
  predictions: Record<string, number>;
  reasons: Reason[];
  result: RoundResult | null;
  shownReasonIds: string[] | null;
  protestedIds: string[];
}

export interface Title {
  playerId: string;
  title: string;
  questionId: string | null;
}

export interface Room {
  code: string;
  operatorToken: string;
  phase: Phase;
  players: Player[];
  rounds: Round[];
  mainQueue: string[];
  spareQueue: string[];
  usedComments: string[];
  titles: Title[] | null;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
}

export type ErrorCode =
  | 'NAME_INVALID' | 'NAME_TAKEN' | 'ROOM_FULL' | 'ROOM_NOT_FOUND' | 'UNAUTHORIZED'
  | 'WRONG_PHASE' | 'NOT_ENOUGH_PLAYERS' | 'PLAYER_NOT_FOUND' | 'NOT_PENDING'
  | 'NOT_ELIGIBLE' | 'ALREADY_VOTED' | 'SELF_VOTE' | 'INVALID_TARGET' | 'INVALID_PREDICTION'
  | 'REASON_TOO_LONG' | 'REASON_NOT_FOUND' | 'NO_VOTES' | 'NO_SPARE' | 'LAST_ROUND'
  | 'NOT_TOP' | 'ALREADY_PROTESTED' | 'INVALID_REACTION' | 'RATE_LIMITED';

export class GameError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode) {
    super(code);
    this.name = 'GameError';
    this.code = code;
  }
}
