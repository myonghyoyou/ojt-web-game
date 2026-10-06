import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS, admitPlayer, createRoom, joinRoom, removePlayer, renamePlayer, startGame } from '../src';
import { code, lobby, started } from './helpers';

describe('joinRoom', () => {
  it('adds an active player in the lobby with a trimmed name', () => {
    const room = createRoom('1234', 'op', 0);
    const player = joinRoom(room, '  민수 ', 'id-1', 'tk-1');
    expect(player).toMatchObject({ name: '민수', status: 'active', joinedRound: 0, connected: true });
    expect(room.players).toHaveLength(1);
  });

  it('accepts 1 to 6 characters only', () => {
    const room = createRoom('1234', 'op', 0);
    expect(code(() => joinRoom(room, '   ', 'a', 'a'))).toBe('NAME_INVALID');
    expect(code(() => joinRoom(room, '일곱글자이름임', 'b', 'b'))).toBe('NAME_INVALID');
    expect(code(() => joinRoom(room, '여섯글자이름', 'c', 'c'))).toBe('NO_ERROR');
  });

  it('rejects duplicate names but allows reusing a removed name', () => {
    const room = lobby(['A', 'B']);
    expect(code(() => joinRoom(room, 'A', 'x', 'x'))).toBe('NAME_TAKEN');
    removePlayer(room, 'id-A');
    expect(code(() => joinRoom(room, 'A', 'y', 'y'))).toBe('NO_ERROR');
  });

  it('caps the room at 8 present players', () => {
    const room = lobby(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(MAX_PLAYERS).toBe(8);
    expect(code(() => joinRoom(room, '9', 'id-9', 'tk-9'))).toBe('ROOM_FULL');
  });

  it('makes late joiners pending and keeps them out of the current round', () => {
    const room = started();
    const late = joinRoom(room, 'E', 'id-E', 'tk-E');
    expect(late).toMatchObject({ status: 'pending', joinedRound: -1 });
    expect(room.rounds[0].eligibleIds).not.toContain('id-E');
  });

  it('refuses joins after the game is over', () => {
    const room = lobby(['A', 'B', 'C']);
    room.phase = 'final';
    expect(code(() => joinRoom(room, 'Z', 'id-Z', 'tk-Z'))).toBe('WRONG_PHASE');
  });
});

describe('startGame', () => {
  it('needs at least 3 active players', () => {
    expect(code(() => startGame(lobby(['A', 'B']), 5))).toBe('NOT_ENOUGH_PLAYERS');
  });

  it('opens round 1 with the first curated question', () => {
    const room = lobby(['A', 'B', 'C', 'D']);
    startGame(room, 5);
    expect(room.phase).toBe('voting');
    expect(room.startedAt).toBe(5);
    expect(room.rounds).toHaveLength(1);
    expect(room.rounds[0].questionId).toBe('alien');
    expect(room.rounds[0].eligibleIds).toEqual(['id-A', 'id-B', 'id-C', 'id-D']);
    expect(room.mainQueue).toHaveLength(6);
  });

  it('cannot start twice', () => {
    expect(code(() => startGame(started(), 6))).toBe('WRONG_PHASE');
  });
});

describe('admitPlayer', () => {
  it('lets a pending player join from the next round', () => {
    const room = started();
    joinRoom(room, 'E', 'id-E', 'tk-E');
    admitPlayer(room, 'id-E');
    expect(room.players.find((p) => p.id === 'id-E')).toMatchObject({ status: 'active', joinedRound: 1 });
    expect(room.rounds[0].eligibleIds).not.toContain('id-E');
  });

  it('only admits pending players', () => {
    expect(code(() => admitPlayer(started(), 'id-A'))).toBe('NOT_PENDING');
  });
});

describe('renamePlayer', () => {
  it('validates like joining', () => {
    const room = lobby(['A', 'B']);
    renamePlayer(room, 'id-A', '에이');
    expect(room.players[0].name).toBe('에이');
    renamePlayer(room, 'id-A', '에이');
    expect(code(() => renamePlayer(room, 'id-A', 'B'))).toBe('NAME_TAKEN');
    expect(code(() => renamePlayer(room, 'nope', 'Z'))).toBe('PLAYER_NOT_FOUND');
  });
});

describe('removePlayer', () => {
  it('drops the player from the current round immediately', () => {
    const room = started();
    removePlayer(room, 'id-D');
    expect(room.rounds[0].eligibleIds).toEqual(['id-A', 'id-B', 'id-C']);
    expect(room.players.find((p) => p.id === 'id-D')?.status).toBe('removed');
  });
});
