import type { CSSProperties } from 'react';

export interface PlayerColor {
  name: string;
  bg: string;
  /** Text color that keeps WCAG AA on `bg`. */
  fg: string;
}

const INK = '#16161d';

/** Index = Player.color from the server (join order). Colors carry identity, so names always appear with them. */
export const PLAYER_COLORS: PlayerColor[] = [
  { name: '코랄', bg: '#ff6b57', fg: INK },
  { name: '해바라기', bg: '#ffc93c', fg: INK },
  { name: '민트', bg: '#2ed3b7', fg: INK },
  { name: '핑크', bg: '#ff5fa2', fg: INK },
  { name: '바이올렛', bg: '#7b61ff', fg: '#ffffff' },
  { name: '탠저린', bg: '#ff9f1c', fg: INK },
  { name: '라임', bg: '#b6e94a', fg: INK },
  { name: '스카이', bg: '#00ace6', fg: INK },
];

export function playerColor(index: number): PlayerColor {
  return PLAYER_COLORS[index % PLAYER_COLORS.length] ?? PLAYER_COLORS[0];
}

export function colorStyle(index: number): CSSProperties {
  const c = playerColor(index);
  return { backgroundColor: c.bg, color: c.fg };
}
