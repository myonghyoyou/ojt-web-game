import type { CSSProperties } from 'react';

export interface PlayerColor {
  name: string;
  bg: string;
  /** Text color that keeps WCAG AA on `bg`, chosen by contrast. */
  fg: string;
}

const INK = '#16161d';
const WHITE = '#ffffff';

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** White or ink, whichever reads better on `bg`. */
export function readableText(bg: string): string {
  return contrastRatio(WHITE, bg) >= contrastRatio(INK, bg) ? WHITE : INK;
}

const SWATCHES: [name: string, bg: string][] = [
  ['코랄', '#ff6b57'],
  ['해바라기', '#ffc93c'],
  ['민트', '#2ed3b7'],
  ['핑크', '#ff5fa2'],
  // #7b61ff failed 4.5:1 with both white and ink text; this darker violet carries white text at 5.3:1.
  ['바이올렛', '#6a4ff0'],
  ['탠저린', '#ff9f1c'],
  ['라임', '#b6e94a'],
  ['스카이', '#00ace6'],
];

/** Index = Player.color from the server (join order). Colors carry identity, so names always appear with them. */
export const PLAYER_COLORS: PlayerColor[] = SWATCHES.map(([name, bg]) => ({ name, bg, fg: readableText(bg) }));

export function playerColor(index: number): PlayerColor {
  return PLAYER_COLORS[index % PLAYER_COLORS.length] ?? PLAYER_COLORS[0];
}

export function colorStyle(index: number): CSSProperties {
  const c = playerColor(index);
  return { backgroundColor: c.bg, color: c.fg };
}
