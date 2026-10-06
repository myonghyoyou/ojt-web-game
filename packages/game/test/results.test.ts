import { describe, expect, it } from 'vitest';
import {
  MAIN_IDS, MYSTERY_TITLE, finish, hideReason, isLastRound, maybeAutoReveal, nextRound,
  protest, reveal, showReasons, skipQuestion, usableSpareIds,
} from '../src';
import { code, first, lobby, revealUnanimousD, started, vote } from './helpers';

function playToLastRound(room: ReturnType<typeof started>) {
  while (!isLastRound(room)) {
    vote(room, 'A', 'B');
    reveal(room, first);
    nextRound(room);
  }
}

describe('reasons', () => {
  it('shows at most two reasons, only those written for the winner', () => {
    const room = started();
    revealUnanimousD(room);
    showReasons(room, first);
    const round = room.rounds[0];
    expect(round.shownReasonIds).toHaveLength(2);
    for (const id of round.shownReasonIds ?? []) {
      expect(round.reasons.find((r) => r.id === id)?.targetId).toBe('id-D');
    }
  });

  it('never shows hidden reasons and pulls a shown one off when hidden', () => {
    const room = started();
    revealUnanimousD(room);
    const round = room.rounds[0];
    const forD = round.reasons.filter((r) => r.targetId === 'id-D');
    hideReason(room, forD[0].id);
    hideReason(room, forD[1].id);
    showReasons(room, first);
    expect(round.shownReasonIds).toEqual([forD[2].id]);
    hideReason(room, forD[2].id);
    expect(round.shownReasonIds).toEqual([]);
  });

  it('rejects unknown reason ids and use outside the result phase', () => {
    const room = started();
    expect(code(() => showReasons(room, first))).toBe('WRONG_PHASE');
    revealUnanimousD(room);
    expect(code(() => hideReason(room, 'nope'))).toBe('REASON_NOT_FOUND');
  });
});

describe('protest', () => {
  it('lets only the winner protest, once per round', () => {
    const room = started();
    revealUnanimousD(room);
    expect(code(() => protest(room, 'id-A'))).toBe('NOT_TOP');
    protest(room, 'id-D');
    expect(room.rounds[0].protestedIds).toEqual(['id-D']);
    expect(code(() => protest(room, 'id-D'))).toBe('ALREADY_PROTESTED');
  });
});

describe('nextRound', () => {
  it('walks the curated order and stops after round 7', () => {
    const room = started();
    expect(code(() => nextRound(room))).toBe('WRONG_PHASE');
    playToLastRound(room);
    expect(room.rounds.map((r) => r.questionId)).toEqual(MAIN_IDS);
    vote(room, 'A', 'B');
    reveal(room, first);
    expect(code(() => nextRound(room))).toBe('LAST_ROUND');
  });
});

describe('skipQuestion', () => {
  it('swaps the current question for the next spare and drops its votes', () => {
    const room = started();
    vote(room, 'A', 'B');
    skipQuestion(room);
    expect(room.rounds).toHaveLength(1);
    expect(room.rounds[0].questionId).toBe('festival');
    expect(room.rounds[0].votedIds).toEqual([]);
  });

  it('never adds a second mistake-type question while one is still ahead', () => {
    const room = started();
    skipQuestion(room);
    skipQuestion(room);
    expect(usableSpareIds(room)).toEqual([]);
    expect(code(() => skipQuestion(room))).toBe('NO_SPARE');
  });

  it('allows the mistake-type spare once the mistake-type main question is skipped', () => {
    const room = started();
    playToLastRound(room);
    expect(room.rounds[6].questionId).toBe('karaoke');
    skipQuestion(room);
    skipQuestion(room);
    skipQuestion(room);
    expect(room.rounds[6].questionId).toBe('passport');
  });
});

describe('finish', () => {
  it('cannot finish from the lobby', () => {
    expect(code(() => finish(lobby(['A', 'B', 'C']), 1))).toBe('WRONG_PHASE');
  });

  it('drops an unrevealed round when ending early', () => {
    const room = started();
    revealUnanimousD(room);
    nextRound(room);
    vote(room, 'A', 'B');
    finish(room, 9000);
    expect(room.rounds).toHaveLength(1);
    expect(room.phase).toBe('final');
    expect(room.endedAt).toBe(9000);
  });

  it('gives each player one unique title and a mystery title to the rest', () => {
    const room = started();
    // Round 1 (alien): D gets 3 of 4, A gets 1.
    revealUnanimousD(room);
    nextRound(room);
    // Round 2 (island): A 2, B 2.
    vote(room, 'A', 'B');
    vote(room, 'B', 'A');
    vote(room, 'C', 'A');
    vote(room, 'D', 'B');
    maybeAutoReveal(room, first);
    nextRound(room);
    // Round 3 (zombie): D 3, C 1.
    vote(room, 'A', 'D');
    vote(room, 'B', 'D');
    vote(room, 'C', 'D');
    vote(room, 'D', 'C');
    maybeAutoReveal(room, first);
    finish(room, 9000);
    expect(room.titles).toEqual([
      { playerId: 'id-A', title: '무인도 정착 담당', questionId: 'island' },
      { playerId: 'id-B', title: MYSTERY_TITLE, questionId: null },
      { playerId: 'id-C', title: '좀비 사태 생존 담당', questionId: 'zombie' },
      { playerId: 'id-D', title: '외계인과 셀카 찍을 사람', questionId: 'alien' },
    ]);
  });
});
