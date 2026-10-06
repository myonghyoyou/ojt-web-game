import { describe, expect, it } from 'vitest';
import { allVoted, classify, joinRoom, maybeAutoReveal, removePlayer, reveal, totalVotes } from '../src';
import { code, first, started, vote } from './helpers';

describe('submitVote', () => {
  it('counts the vote without linking voter to target', () => {
    const room = started();
    vote(room, 'A', 'B', 1, ' 평소에도 그럼 ');
    const round = room.rounds[0];
    expect(round.votes).toEqual({ 'id-B': 1 });
    expect(round.votedIds).toEqual(['id-A']);
    expect(round.predictions).toEqual({ 'id-A': 1 });
    expect(round.reasons).toEqual([{ id: expect.any(String), targetId: 'id-B', text: '평소에도 그럼', hidden: false }]);
    expect(Object.keys(round).sort()).toEqual([
      'eligibleIds', 'predictions', 'protestedIds', 'questionId', 'reasons', 'result', 'shownReasonIds', 'votedIds', 'votes',
    ]);
  });

  it('does not store blank reasons', () => {
    const room = started();
    vote(room, 'A', 'B', 0, '   ');
    expect(room.rounds[0].reasons).toEqual([]);
  });

  it('inserts reasons at a random position so their order does not reveal the author', () => {
    const room = started();
    vote(room, 'A', 'B', 0, '첫째');
    vote(room, 'C', 'B', 0, '둘째');
    expect(room.rounds[0].reasons.map((r) => r.text)).toEqual(['둘째', '첫째']);
  });

  it.each([
    ['a self vote', 'A', 'A', 0, '', 'SELF_VOTE'],
    ['an unknown target', 'A', 'Z', 0, '', 'INVALID_TARGET'],
    ['a prediction above the voter count', 'A', 'B', 4, '', 'INVALID_PREDICTION'],
    ['a negative prediction', 'A', 'B', -1, '', 'INVALID_PREDICTION'],
    ['a fractional prediction', 'A', 'B', 1.5, '', 'INVALID_PREDICTION'],
    ['a 21-character reason', 'A', 'B', 0, '가'.repeat(21), 'REASON_TOO_LONG'],
  ])('rejects %s', (_label, voter, target, prediction, reason, expected) => {
    const room = started();
    expect(code(() => vote(room, voter, target, prediction, reason))).toBe(expected);
  });

  it('accepts a 20-character reason', () => {
    const room = started();
    expect(code(() => vote(room, 'A', 'B', 0, '가'.repeat(20)))).toBe('NO_ERROR');
  });

  it('rejects a second vote', () => {
    const room = started();
    vote(room, 'A', 'B');
    expect(code(() => vote(room, 'A', 'C'))).toBe('ALREADY_VOTED');
  });

  it('rejects pending and removed players', () => {
    const room = started();
    joinRoom(room, 'E', 'id-E', 'tk-E');
    expect(code(() => vote(room, 'E', 'A'))).toBe('NOT_ELIGIBLE');
    removePlayer(room, 'id-D');
    expect(code(() => vote(room, 'D', 'A'))).toBe('NOT_ELIGIBLE');
    expect(code(() => vote(room, 'A', 'D'))).toBe('INVALID_TARGET');
  });

  it('rejects votes outside the voting phase', () => {
    const room = started();
    vote(room, 'A', 'B');
    reveal(room, first);
    expect(code(() => vote(room, 'C', 'B'))).toBe('WRONG_PHASE');
  });
});

describe('classify', () => {
  const play = (pairs: [string, string][]) => {
    const room = started();
    for (const [voter, target] of pairs) vote(room, voter, target);
    return classify(room.rounds[0]);
  };

  it('treats 3-1 as unanimous except self', () => {
    expect(play([['A', 'D'], ['B', 'D'], ['C', 'D'], ['D', 'A']])).toEqual({ topIds: ['id-D'], type: 'unanimous' });
  });

  it('treats 2-2 as a tie', () => {
    expect(play([['A', 'B'], ['B', 'A'], ['C', 'A'], ['D', 'B']])).toEqual({ topIds: ['id-A', 'id-B'], type: 'tie' });
  });

  it('treats 2-1-1 as normal', () => {
    expect(play([['A', 'B'], ['B', 'A'], ['C', 'A'], ['D', 'C']])).toEqual({ topIds: ['id-A'], type: 'normal' });
  });

  it('treats 1-1-1-1 as scattered', () => {
    expect(play([['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']])).toEqual({
      topIds: ['id-A', 'id-B', 'id-C', 'id-D'],
      type: 'scattered',
    });
  });

  it('treats 2-1 with three players as unanimous', () => {
    const room = started(['A', 'B', 'C']);
    vote(room, 'A', 'C');
    vote(room, 'B', 'C');
    vote(room, 'C', 'A');
    expect(classify(room.rounds[0]).type).toBe('unanimous');
  });
});

describe('reveal', () => {
  it('auto-reveals exactly once when everyone has voted', () => {
    const room = started();
    vote(room, 'A', 'D');
    vote(room, 'B', 'D');
    vote(room, 'C', 'D');
    expect(maybeAutoReveal(room, first)).toBe(false);
    vote(room, 'D', 'A');
    expect(allVoted(room.rounds[0])).toBe(true);
    expect(maybeAutoReveal(room, first)).toBe(true);
    expect(maybeAutoReveal(room, first)).toBe(false);
    expect(room.phase).toBe('reveal');
    expect(room.rounds[0].result).toMatchObject({
      topIds: ['id-D'],
      type: 'unanimous',
      comment: '본인 제외 전원 일치. 이견은 없었습니다.',
    });
  });

  it('lets the operator reveal partial votes but not zero votes', () => {
    const room = started();
    expect(code(() => reveal(room, first))).toBe('NO_VOTES');
    vote(room, 'A', 'B');
    reveal(room, first);
    expect(totalVotes(room.rounds[0])).toBe(1);
    expect(room.rounds[0].result?.type).toBe('scattered');
  });

  it('auto-reveals when the only non-voter is removed', () => {
    const room = started();
    vote(room, 'A', 'B');
    vote(room, 'B', 'A');
    vote(room, 'C', 'A');
    removePlayer(room, 'id-D');
    expect(maybeAutoReveal(room, first)).toBe(true);
  });

  it('highlights the biggest prediction miss', () => {
    const room = started();
    vote(room, 'A', 'D', 1);
    vote(room, 'B', 'D', 1);
    vote(room, 'C', 'D', 1);
    vote(room, 'D', 'A', 0);
    maybeAutoReveal(room, first);
    expect(room.rounds[0].result?.prediction).toEqual({
      playerId: 'id-D', predicted: 0, actual: 3, kind: 'under', comment: '본인만 몰랐습니다.',
    });
  });

  it('praises a single winner who predicted exactly when nobody missed by 2+', () => {
    const room = started();
    vote(room, 'A', 'B', 2);
    vote(room, 'B', 'A', 1);
    vote(room, 'C', 'A', 1);
    vote(room, 'D', 'C', 0);
    maybeAutoReveal(room, first);
    expect(room.rounds[0].result?.prediction).toMatchObject({ playerId: 'id-A', kind: 'exact' });
  });

  it('shows no prediction when nothing stands out', () => {
    const room = started();
    vote(room, 'A', 'B');
    vote(room, 'B', 'C');
    vote(room, 'C', 'D');
    vote(room, 'D', 'A');
    maybeAutoReveal(room, first);
    expect(room.rounds[0].result?.prediction).toBeNull();
  });
});
