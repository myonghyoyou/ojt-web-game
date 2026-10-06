import { PREDICTION_COMMENTS, pickComment, resultPool } from './comments';
import {
  GameError, REASON_MAX,
  type PredictionHighlight, type PredictionKind, type ResultType, type Rng, type Room, type Round,
} from './types';

export function eligibleIdsFor(room: Room, roundIndex: number): string[] {
  return room.players
    .filter((p) => p.status === 'active' && p.joinedRound >= 0 && p.joinedRound <= roundIndex)
    .map((p) => p.id);
}

export function newRound(room: Room, questionId: string, roundIndex: number): Round {
  return {
    questionId,
    eligibleIds: eligibleIdsFor(room, roundIndex),
    votes: {},
    votedIds: [],
    predictions: {},
    reasons: [],
    result: null,
    shownReasonIds: null,
    protestedIds: [],
  };
}

export function startRound(room: Room, questionId: string): void {
  room.rounds.push(newRound(room, questionId, room.rounds.length));
  room.phase = 'voting';
}

export function currentRound(room: Room): Round {
  const round = room.rounds.at(-1);
  if (!round || (room.phase !== 'voting' && room.phase !== 'reveal')) throw new GameError('WRONG_PHASE');
  return round;
}

export interface VoteInput {
  targetId: string;
  reason?: string;
  prediction: number;
}

export function totalVotes(round: Round): number {
  return Object.values(round.votes).reduce((sum, n) => sum + n, 0);
}

export function allVoted(round: Round): boolean {
  return round.eligibleIds.length > 0 && round.eligibleIds.every((id) => round.votedIds.includes(id));
}

export function submitVote(room: Room, voterId: string, input: VoteInput, reasonId: string, rng: Rng): void {
  if (room.phase !== 'voting') throw new GameError('WRONG_PHASE');
  const round = currentRound(room);
  if (!round.eligibleIds.includes(voterId)) throw new GameError('NOT_ELIGIBLE');
  if (round.votedIds.includes(voterId)) throw new GameError('ALREADY_VOTED');
  if (input.targetId === voterId) throw new GameError('SELF_VOTE');
  if (!round.eligibleIds.includes(input.targetId)) throw new GameError('INVALID_TARGET');
  const maxPrediction = round.eligibleIds.length - 1;
  if (!Number.isInteger(input.prediction) || input.prediction < 0 || input.prediction > maxPrediction) {
    throw new GameError('INVALID_PREDICTION');
  }
  const reason = (input.reason ?? '').trim();
  if (Array.from(reason).length > REASON_MAX) throw new GameError('REASON_TOO_LONG');

  round.votes[input.targetId] = (round.votes[input.targetId] ?? 0) + 1;
  round.votedIds.push(voterId);
  round.predictions[voterId] = input.prediction;
  if (reason) {
    // Random position: arrival order would otherwise line up with the public check marks.
    const at = Math.floor(rng() * (round.reasons.length + 1));
    round.reasons.splice(at, 0, { id: reasonId, targetId: input.targetId, text: reason, hidden: false });
  }
}

export function classify(round: Round): { topIds: string[]; type: ResultType } {
  const counts = round.eligibleIds.map((id) => ({ id, votes: round.votes[id] ?? 0 }));
  const top = Math.max(0, ...counts.map((c) => c.votes));
  const topIds = top > 0 ? counts.filter((c) => c.votes === top).map((c) => c.id) : [];
  let type: ResultType;
  if (topIds.length === 1 && top === round.eligibleIds.length - 1) type = 'unanimous';
  else if (topIds.length >= 2 && top >= 2) type = 'tie';
  else if (top === 1) type = 'scattered';
  else type = 'normal';
  return { topIds, type };
}

function predictionHighlight(round: Round, topIds: string[], used: string[], rng: Rng): PredictionHighlight | null {
  const rows = round.eligibleIds
    .filter((id) => id in round.predictions)
    .map((id, order) => {
      const actual = round.votes[id] ?? 0;
      const predicted = round.predictions[id] as number;
      return { id, order, actual, predicted, diff: Math.abs(actual - predicted) };
    });
  const bigMiss = rows
    .filter((r) => r.diff >= 2)
    .sort((a, b) => b.diff - a.diff || b.actual - a.actual || a.order - b.order)[0];

  let pick = bigMiss;
  let kind: PredictionKind | null = bigMiss ? (bigMiss.actual > bigMiss.predicted ? 'under' : 'over') : null;
  if (!pick && topIds.length === 1) {
    const winner = rows.find((r) => r.id === topIds[0]);
    if (winner && winner.diff === 0) {
      pick = winner;
      kind = 'exact';
    }
  }
  if (!pick || !kind) return null;
  return {
    playerId: pick.id,
    predicted: pick.predicted,
    actual: pick.actual,
    kind,
    comment: pickComment(PREDICTION_COMMENTS[kind], used, rng),
  };
}

export function reveal(room: Room, rng: Rng): void {
  if (room.phase !== 'voting') throw new GameError('WRONG_PHASE');
  const round = currentRound(room);
  if (totalVotes(round) === 0) throw new GameError('NO_VOTES');
  const { topIds, type } = classify(round);
  const comment = pickComment(resultPool(type, topIds.length), room.usedComments, rng);
  round.result = { topIds, type, comment, prediction: predictionHighlight(round, topIds, room.usedComments, rng) };
  room.phase = 'reveal';
}

/** Reveals when every eligible player has voted. Safe to call after any change; returns whether it revealed. */
export function maybeAutoReveal(room: Room, rng: Rng): boolean {
  if (room.phase !== 'voting') return false;
  const round = currentRound(room);
  if (!allVoted(round) || totalVotes(round) === 0) return false;
  reveal(room, rng);
  return true;
}
