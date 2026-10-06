'use client';

import { useEffect, useState } from 'react';
import { getSocket, type AckResult } from './socket';

/**
 * Subscribes to the role-specific 'state' stream. `attach` (auth / watch / resume) runs on every
 * (re)connect, which is what brings a phone back after it sleeps. Change `key` to re-attach.
 */
export function useRoomState<V>(key: string, attach: (() => Promise<AckResult<object>>) | null) {
  const [view, setView] = useState<V | null>(null);
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attach) return;
    const socket = getSocket();
    const onState = (next: V) => {
      setView(next);
      setError(null);
    };
    const onClosed = () => setClosed(true);
    const onConnect = () => {
      void attach().then((res) => {
        if (!res.ok) setError(res.code);
      });
    };
    socket.on('state', onState);
    socket.on('closed', onClosed);
    socket.on('connect', onConnect);
    if (socket.connected) onConnect();
    return () => {
      socket.off('state', onState);
      socket.off('closed', onClosed);
      socket.off('connect', onConnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures everything attach depends on
  }, [key]);

  return { view, closed, error, setError };
}
