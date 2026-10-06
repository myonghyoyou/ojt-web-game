import { describe, expect, it } from 'vitest';
import {
  MAIN_IDS, MANY_WAY_TIE_COMMENTS, QUESTIONS, RESULT_COMMENTS, SPARE_IDS,
  getQuestion, pickComment, resultPool,
} from '../src';

describe('questions', () => {
  it('has 7 curated main questions and 3 spares, starting light', () => {
    expect(MAIN_IDS).toHaveLength(7);
    expect(SPARE_IDS).toHaveLength(3);
    expect(MAIN_IDS[0]).toBe('alien');
  });

  it('has exactly one mistake-type question in the main set', () => {
    expect(MAIN_IDS.filter((id) => getQuestion(id).mistake)).toEqual(['karaoke']);
  });

  it('gives every question a unique id, a title and a question mark', () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of QUESTIONS) {
      expect(q.title.length).toBeGreaterThan(0);
      expect(q.text.endsWith('?')).toBe(true);
    }
  });

  it('throws on an unknown id', () => {
    expect(() => getQuestion('nope')).toThrow();
  });
});

describe('comments', () => {
  it('avoids used comments until the pool runs out', () => {
    const used: string[] = [];
    const pool = ['a', 'b'];
    expect(pickComment(pool, used, () => 0)).toBe('a');
    expect(pickComment(pool, used, () => 0)).toBe('b');
    expect(pickComment(pool, used, () => 0)).toBe('a');
  });

  it('never indexes past the pool even if rng returns 1', () => {
    expect(pickComment(['a', 'b'], [], () => 1)).toBe('b');
  });

  it('uses the many-way tie pool for 3+ tied leaders', () => {
    expect(resultPool('tie', 3)).toBe(MANY_WAY_TIE_COMMENTS);
    expect(resultPool('tie', 2)).toBe(RESULT_COMMENTS.tie);
  });
});
