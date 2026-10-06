import { describe, expect, it } from 'vitest';
import { formatElapsed, textLength } from './format';

describe('formatElapsed', () => {
  it('formats minutes and seconds in Korean', () => {
    expect(formatElapsed(572_000)).toBe('9분 32초');
    expect(formatElapsed(45_400)).toBe('45초');
    expect(formatElapsed(-5)).toBe('0초');
  });
});

describe('textLength', () => {
  it('counts characters the same way the server does', () => {
    expect(textLength('  민수 ')).toBe(2);
    expect(textLength('여섯글자이름')).toBe(6);
  });
});
