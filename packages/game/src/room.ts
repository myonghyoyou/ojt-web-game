import { MAIN_IDS, SPARE_IDS } from './questions';
import { startRound } from './round';
import { assignTitles } from './titles';
import { GameError, MAX_PLAYERS, MIN_PLAYERS, NAME_MAX, PLAYER_COLOR_COUNT, type Player, type Room } from './types';

export function createRoom(code: string, operatorToken: string, now: number): Room {
  return {
    code,
    operatorToken,
    phase: 'lobby',
    players: [],
    rounds: [],
    mainQueue: [...MAIN_IDS],
    spareQueue: [...SPARE_IDS],
    usedComments: [],
    titles: null,
    createdAt: now,
    startedAt: null,
    endedAt: null,
  };
}

export function normalizeName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, ' ');
  const length = Array.from(name).length;
  if (length < 1 || length > NAME_MAX) throw new GameError('NAME_INVALID');
  return name;
}

export function findPlayer(room: Room, id: string): Player {
  const player = room.players.find((p) => p.id === id);
  if (!player) throw new GameError('PLAYER_NOT_FOUND');
  return player;
}

function presentPlayers(room: Room): Player[] {
  return room.players.filter((p) => p.status !== 'removed');
}

function assertNameFree(room: Room, name: string, exceptId?: string): void {
  if (presentPlayers(room).some((p) => p.name === name && p.id !== exceptId)) throw new GameError('NAME_TAKEN');
}

export function joinRoom(room: Room, rawName: string, id: string, token: string): Player {
  if (room.phase === 'final') throw new GameError('WRONG_PHASE');
  const name = normalizeName(rawName);
  assertNameFree(room, name);
  if (presentPlayers(room).length >= MAX_PLAYERS) throw new GameError('ROOM_FULL');
  const inLobby = room.phase === 'lobby';
  const taken = new Set(presentPlayers(room).map((p) => p.color));
  const color = Array.from({ length: PLAYER_COLOR_COUNT }, (_, i) => i).find((i) => !taken.has(i)) ?? 0;
  const player: Player = {
    id,
    name,
    token,
    status: inLobby ? 'active' : 'pending',
    connected: true,
    joinedRound: inLobby ? 0 : -1,
    color,
  };
  room.players.push(player);
  return player;
}

export function renamePlayer(room: Room, id: string, rawName: string): void {
  const player = findPlayer(room, id);
  const name = normalizeName(rawName);
  assertNameFree(room, name, id);
  player.name = name;
}

export function removePlayer(room: Room, id: string): void {
  const player = findPlayer(room, id);
  player.status = 'removed';
  const round = room.rounds.at(-1);
  if (round && room.phase === 'voting') round.eligibleIds = round.eligibleIds.filter((x) => x !== id);
}

export function admitPlayer(room: Room, id: string): void {
  const player = findPlayer(room, id);
  if (player.status !== 'pending') throw new GameError('NOT_PENDING');
  if (room.phase === 'final') throw new GameError('WRONG_PHASE');
  player.status = 'active';
  player.joinedRound = room.rounds.length;
}

export function startGame(room: Room, now: number): void {
  if (room.phase !== 'lobby') throw new GameError('WRONG_PHASE');
  const active = room.players.filter((p) => p.status === 'active');
  if (active.length < MIN_PLAYERS) throw new GameError('NOT_ENOUGH_PLAYERS');
  const firstQuestion = room.mainQueue.shift();
  if (!firstQuestion) throw new GameError('LAST_ROUND');
  room.startedAt = now;
  startRound(room, firstQuestion);
}

/** Normal end after the last result, or early end from voting/result. An unrevealed round is discarded. */
export function finish(room: Room, now: number): void {
  if (room.phase !== 'voting' && room.phase !== 'reveal') throw new GameError('WRONG_PHASE');
  if (room.phase === 'voting') room.rounds.pop();
  room.titles = assignTitles(room);
  room.phase = 'final';
  room.endedAt = now;
}
