export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;
}

/** Matches the server: trimmed, counted by code point. */
export function textLength(value: string): number {
  return Array.from(value.trim()).length;
}
