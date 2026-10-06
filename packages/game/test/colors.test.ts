import { describe, expect, it } from 'vitest';
import { PLAYER_COLOR_COUNT, joinRoom, removePlayer, viewForOperator, viewForPlayer, viewForStage } from '../src';
import { lobby, revealUnanimousD, started } from './helpers';

describe('player colors', () => {
  it('gives each player the next color in join order', () => {
    const room = lobby(['A', 'B', 'C']);
    expect(room.players.map((p) => p.color)).toEqual([0, 1, 2]);
  });

  it('has one color per possible player', () => {
    expect(PLAYER_COLOR_COUNT).toBe(8);
    const room = lobby(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(new Set(room.players.map((p) => p.color)).size).toBe(8);
  });

  it('reuses the color of a removed player', () => {
    const room = lobby(['A', 'B', 'C']);
    removePlayer(room, 'id-B');
    const late = joinRoom(room, 'D', 'id-D', 'tk-D');
    expect(late.color).toBe(1);
  });

  it('keeps colors for pending late joiners too', () => {
    const room = started();
    expect(joinRoom(room, 'E', 'id-E', 'tk-E').color).toBe(4);
  });

  it('carries the color in stage, operator and player views', () => {
    const room = started();
    revealUnanimousD(room);
    expect(viewForStage(room).players.map((p) => p.color)).toEqual([0, 1, 2, 3]);
    expect(viewForOperator(room).players[3].color).toBe(3);
    const view = viewForPlayer(room, 'id-A');
    expect(view.me.color).toBe(0);
  });

  it('gives candidates their colors on the phone', () => {
    const room = started();
    expect(viewForPlayer(room, 'id-B').round?.candidates).toEqual([
      { id: 'id-A', name: 'A', color: 0 },
      { id: 'id-C', name: 'C', color: 2 },
      { id: 'id-D', name: 'D', color: 3 },
    ]);
  });
});
