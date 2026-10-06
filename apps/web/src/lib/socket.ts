'use client';

import { io, type Socket } from 'socket.io-client';

export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;
let handshakeAuth: Record<string, string> = {};

/**
 * Credentials sent with every (re)connect. The server attaches the socket from them before it
 * processes emits buffered while offline, so a tap during reconnect is not rejected.
 */
export function setHandshakeAuth(auth: Record<string, string>): void {
  handshakeAuth = auth;
}

/**
 * One connection per tab. Socket.IO reconnects by itself; screens re-attach on every 'connect'.
 * Default transports on purpose: long-polling first, then upgrade, so a proxy that blocks WebSocket still works.
 */
export function getSocket(): Socket {
  if (!socket) socket = io(SOCKET_URL, { auth: (cb) => cb(handshakeAuth) });
  return socket;
}

export type AckResult<T extends object = object> = ({ ok: true } & T) | { ok: false; code: string };

export function call<T extends object = object>(event: string, payload: object = {}): Promise<AckResult<T>> {
  return new Promise((resolve) => {
    getSocket()
      .timeout(5000)
      .emit(event, payload, (err: Error | null, res: AckResult<T>) => resolve(err ? { ok: false, code: 'TIMEOUT' } : res));
  });
}
