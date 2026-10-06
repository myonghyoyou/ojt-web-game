import { describe, expect, it } from 'vitest';
import { joinRoom, removePlayer, showReasons, viewForOperator, viewForPlayer, viewForStage } from '../src';
import { code, first, revealUnanimousD, started, vote } from './helpers';

describe('viewForPlayer', () => {
  it('lists the other eligible players as candidates', () => {
    const room = started();
    const view = viewForPlayer(room, 'id-A');
    expect(view.round?.candidates.map((c) => c.name)).toEqual(['B', 'C', 'D']);
    expect(view.round?.maxPrediction).toBe(3);
    expect(view.me).toMatchObject({ name: 'A', status: 'active', eligible: true });
    expect(view.playerCount).toBe(4);
  });

  it('never leaks other players predictions or reasons', () => {
    const room = started();
    vote(room, 'B', 'A', 2, '비밀 이유');
    const json = JSON.stringify(viewForPlayer(room, 'id-A'));
    expect(json).not.toContain('비밀 이유');
    expect(json).not.toContain('predictions');
  });

  it('reports hasVoted so a phone that wakes up shows the waiting screen', () => {
    const room = started();
    vote(room, 'A', 'B');
    expect(viewForPlayer(room, 'id-A').round).toMatchObject({ hasVoted: true, votedCount: 1, eligibleCount: 4 });
    expect(viewForPlayer(room, 'id-B').round?.hasVoted).toBe(false);
  });

  it('flags the winner for the big protest button', () => {
    const room = started();
    revealUnanimousD(room);
    expect(viewForPlayer(room, 'id-D').isTop).toBe(true);
    expect(viewForPlayer(room, 'id-A').isTop).toBe(false);
  });

  it('does not count a removed player\'s vote toward voting progress', () => {
    const room = started();
    vote(room, 'D', 'A');
    vote(room, 'B', 'A');
    removePlayer(room, 'id-D');
    expect(viewForPlayer(room, 'id-A').round).toMatchObject({ votedCount: 1, eligibleCount: 3 });
    expect(viewForStage(room).round).toMatchObject({ votedIds: ['id-B'], eligibleIds: ['id-A', 'id-B', 'id-C'] });
  });

  it('marks pending late joiners as not eligible', () => {
    const room = started();
    joinRoom(room, 'E', 'id-E', 'tk-E');
    expect(viewForPlayer(room, 'id-E').me).toMatchObject({ status: 'pending', eligible: false });
  });

  it('throws for unknown players', () => {
    expect(code(() => viewForPlayer(started(), 'nope'))).toBe('PLAYER_NOT_FOUND');
  });
});

describe('viewForStage', () => {
  it('hides reasons until the operator shows them', () => {
    const room = started();
    revealUnanimousD(room);
    expect(viewForStage(room).result?.reasons).toBeNull();
    showReasons(room, first);
    expect(viewForStage(room).result?.reasons).toHaveLength(2);
  });

  it('shows counts per eligible player but no individual predictions', () => {
    const room = started();
    revealUnanimousD(room);
    const view = viewForStage(room);
    expect(view.result?.counts).toEqual([
      { playerId: 'id-A', votes: 1 },
      { playerId: 'id-B', votes: 0 },
      { playerId: 'id-C', votes: 0 },
      { playerId: 'id-D', votes: 3 },
    ]);
    expect(JSON.stringify(view)).not.toContain('predictions');
    expect(JSON.stringify(view)).not.toContain('token');
  });

  it('hides removed players', () => {
    const room = started();
    removePlayer(room, 'id-D');
    expect(viewForStage(room).players.map((p) => p.name)).toEqual(['A', 'B', 'C']);
  });
});

describe('viewForOperator', () => {
  it('previews every reason written for the winner', () => {
    const room = started();
    revealUnanimousD(room);
    const reasons = viewForOperator(room).reasons;
    expect(reasons.map((r) => r.targetName)).toEqual(['D', 'D', 'D']);
    expect(reasons.every((r) => !r.hidden)).toBe(true);
  });

  it('reports how many spares can still be used', () => {
    expect(viewForOperator(started()).spareLeft).toBe(2);
  });
});
