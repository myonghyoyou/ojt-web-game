import { getQuestion } from './questions';
import { isLastRound, usableSpareIds } from './round';
import { MYSTERY_NOTE } from './titles';
import {
  GameError, TOTAL_ROUNDS,
  type Phase, type PlayerStatus, type PredictionHighlight, type ResultType, type Room, type Round,
} from './types';

export interface PublicPlayer { id: string; name: string; connected: boolean; status: 'active' | 'pending' }
export interface RoundInfo { number: number; total: number; question: string; eligibleIds: string[]; votedIds: string[] }
export interface ResultInfo {
  counts: { playerId: string; votes: number }[];
  topIds: string[];
  type: ResultType;
  comment: string;
  prediction: PredictionHighlight | null;
  /** null until the operator presses "이유 보기". */
  reasons: string[] | null;
  protestedIds: string[];
}
export interface TitleInfo { playerId: string; name: string; title: string; note: string | null }
export interface StageView {
  role: 'stage';
  code: string;
  phase: Phase;
  players: PublicPlayer[];
  round: RoundInfo | null;
  result: ResultInfo | null;
  titles: TitleInfo[] | null;
  startedAt: number | null;
  endedAt: number | null;
}
export interface OperatorReason { id: string; targetName: string; text: string; hidden: boolean }
export interface OperatorView extends Omit<StageView, 'role'> {
  role: 'operator';
  reasons: OperatorReason[];
  isLastRound: boolean;
  spareLeft: number;
}
export interface PlayerRoundInfo {
  number: number;
  total: number;
  question: string;
  candidates: { id: string; name: string }[];
  hasVoted: boolean;
  votedCount: number;
  eligibleCount: number;
  maxPrediction: number;
}
export interface PlayerView {
  role: 'player';
  code: string;
  phase: Phase;
  me: { id: string; name: string; status: PlayerStatus; eligible: boolean };
  round: PlayerRoundInfo | null;
  isTop: boolean;
  hasProtested: boolean;
  /** Active players, for the lobby screen. */
  playerCount: number;
}

function nameOf(room: Room, id: string): string {
  return room.players.find((p) => p.id === id)?.name ?? '';
}

/** Voters still in the round. A removed player's vote stays counted, but not as voting progress. */
function votedEligible(round: Round): string[] {
  return round.votedIds.filter((id) => round.eligibleIds.includes(id));
}

function liveRound(room: Room): Round | null {
  const round = room.rounds.at(-1);
  return round && (room.phase === 'voting' || room.phase === 'reveal') ? round : null;
}

function roundInfo(room: Room): RoundInfo | null {
  const round = liveRound(room);
  if (!round) return null;
  return {
    number: room.rounds.length,
    total: TOTAL_ROUNDS,
    question: getQuestion(round.questionId).text,
    eligibleIds: [...round.eligibleIds],
    votedIds: votedEligible(round),
  };
}

function resultInfo(room: Room): ResultInfo | null {
  const round = liveRound(room);
  if (room.phase !== 'reveal' || !round?.result) return null;
  const textOf = (id: string) => round.reasons.find((r) => r.id === id)?.text ?? '';
  return {
    counts: round.eligibleIds.map((playerId) => ({ playerId, votes: round.votes[playerId] ?? 0 })),
    topIds: [...round.result.topIds],
    type: round.result.type,
    comment: round.result.comment,
    prediction: round.result.prediction,
    reasons: round.shownReasonIds ? round.shownReasonIds.map(textOf) : null,
    protestedIds: [...round.protestedIds],
  };
}

function titleInfo(room: Room): TitleInfo[] | null {
  if (!room.titles) return null;
  return room.titles.map((t) => ({
    playerId: t.playerId,
    name: nameOf(room, t.playerId),
    title: t.title,
    note: t.questionId ? null : MYSTERY_NOTE,
  }));
}

export function viewForStage(room: Room): StageView {
  return {
    role: 'stage',
    code: room.code,
    phase: room.phase,
    players: room.players
      .filter((p) => p.status !== 'removed')
      .map((p) => ({ id: p.id, name: p.name, connected: p.connected, status: p.status === 'pending' ? 'pending' : 'active' })),
    round: roundInfo(room),
    result: resultInfo(room),
    titles: titleInfo(room),
    startedAt: room.startedAt,
    endedAt: room.endedAt,
  };
}

export function viewForOperator(room: Room): OperatorView {
  const stage = viewForStage(room);
  const round = liveRound(room);
  const topIds = room.phase === 'reveal' && round?.result ? round.result.topIds : [];
  const reasons = round
    ? round.reasons
        .filter((r) => topIds.includes(r.targetId))
        .map((r) => ({ id: r.id, targetName: nameOf(room, r.targetId), text: r.text, hidden: r.hidden }))
    : [];
  return { ...stage, role: 'operator', reasons, isLastRound: isLastRound(room), spareLeft: usableSpareIds(room).length };
}

export function viewForPlayer(room: Room, playerId: string): PlayerView {
  const me = room.players.find((p) => p.id === playerId);
  if (!me) throw new GameError('PLAYER_NOT_FOUND');
  const round = liveRound(room);
  return {
    role: 'player',
    code: room.code,
    phase: room.phase,
    me: { id: me.id, name: me.name, status: me.status, eligible: !!round && round.eligibleIds.includes(playerId) },
    round: round
      ? {
          number: room.rounds.length,
          total: TOTAL_ROUNDS,
          question: getQuestion(round.questionId).text,
          candidates: round.eligibleIds.filter((id) => id !== playerId).map((id) => ({ id, name: nameOf(room, id) })),
          hasVoted: round.votedIds.includes(playerId),
          votedCount: votedEligible(round).length,
          eligibleCount: round.eligibleIds.length,
          maxPrediction: Math.max(0, round.eligibleIds.length - 1),
        }
      : null,
    isTop: !!round?.result?.topIds.includes(playerId),
    hasProtested: !!round?.protestedIds.includes(playerId),
    playerCount: room.players.filter((p) => p.status === 'active').length,
  };
}
