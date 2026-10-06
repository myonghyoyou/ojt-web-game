import { GameError, type Room, type Round } from './types';

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
