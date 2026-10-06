import { describe, expect, it } from 'vitest';
import { PLAYER_COLORS, contrastRatio, readableText } from './colors';

describe('readableText', () => {
  it('picks white on dark backgrounds and ink on light ones', () => {
    expect(readableText('#6a4ff0')).toBe('#ffffff');
    expect(readableText('#006cb7')).toBe('#ffffff');
    expect(readableText('#ffc93c')).toBe('#16161d');
    expect(readableText('#b6e94a')).toBe('#16161d');
  });

  it('keeps every player color readable (WCAG AA 4.5:1)', () => {
    for (const c of PLAYER_COLORS) {
      expect(c.fg).toBe(readableText(c.bg));
      expect(contrastRatio(c.fg, c.bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
