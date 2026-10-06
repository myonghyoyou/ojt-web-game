'use client';

import { useEffect } from 'react';
import { SOCKET_URL } from './socket';

/** Render's free plan sleeps after idle time; the stage screen keeps it awake while the game is open. */
export function useHealthPing(intervalMs = 4 * 60 * 1000): void {
  useEffect(() => {
    const ping = () => {
      void fetch(`${SOCKET_URL}/health`).catch(() => undefined);
    };
    ping();
    const timer = setInterval(ping, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
}
