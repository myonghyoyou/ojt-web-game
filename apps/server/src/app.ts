import { createServer, type Server as HttpServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Server, type Socket } from 'socket.io';
import {
  GameError, REACTION_KINDS, ROOM_TTL_MS,
  admitPlayer, allVoted, createRoom, findPlayer, finish, hideReason, joinRoom, maybeAutoReveal, nextRound, protest,
  removePlayer, renamePlayer, reveal, showReasons, skipQuestion, startGame, submitVote,
  viewForOperator, viewForPlayer, viewForStage,
  type ReactionKind, type Rng, type Room,
} from '@ojt/game';
import { RoomStore } from './store';

type Role = 'stage' | 'operator' | 'player';
interface SocketData { code?: string; role?: Role; playerId?: string }
type AckResponse = { ok: true; [key: string]: unknown } | { ok: false; code: string };
type Payload = Record<string, unknown>;

export interface AppOptions {
  /** Allowed web origins, or true to allow any (local development). */
  origin: string[] | true;
  now?: () => number;
  rng?: Rng;
  sweepMs?: number;
  /** Pause between "everyone voted" and the automatic reveal. */
  revealDelayMs?: number;
}

export interface App {
  http: HttpServer;
  io: Server;
  rooms: RoomStore;
  sweep: () => void;
  close: () => Promise<void>;
}

const REACTION_WINDOW_MS = 1000;
const REACTIONS_PER_WINDOW = 2;

export function createApp(options: AppOptions): App {
  const now = options.now ?? Date.now;
  const rng = options.rng ?? Math.random;
  const rooms = new RoomStore();
  const reactionLog = new Map<string, number[]>();
  const revealTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const revealDelayMs = options.revealDelayMs ?? 900;

  const http = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain', 'access-control-allow-origin': '*' });
      res.end('ok');
      return;
    }
    res.writeHead(404);
    res.end();
  });
  const io = new Server(http, { cors: { origin: options.origin } });

  const stageRoom = (code: string) => `${code}:stage`;
  const operatorRoom = (code: string) => `${code}:operator`;
  const playerRoom = (code: string, playerId: string) => `${code}:player:${playerId}`;

  function requireRoom(code: unknown): Room {
    const room = typeof code === 'string' ? rooms.get(code) : undefined;
    if (!room) throw new GameError('ROOM_NOT_FOUND');
    return room;
  }

  function broadcast(room: Room): void {
    io.to(stageRoom(room.code)).emit('state', viewForStage(room));
    io.to(operatorRoom(room.code)).emit('state', viewForOperator(room));
    for (const player of room.players) {
      io.to(playerRoom(room.code, player.id)).emit('state', viewForPlayer(room, player.id));
    }
  }

  function closeRoom(room: Room): void {
    const targets = [stageRoom(room.code), operatorRoom(room.code), ...room.players.map((p) => playerRoom(room.code, p.id))];
    io.to(targets).emit('closed');
    io.in(targets).socketsLeave(targets);
    rooms.delete(room.code);
    clearTimeout(revealTimers.get(room.code));
    revealTimers.delete(room.code);
    for (const key of reactionLog.keys()) if (key.startsWith(`${room.code}:`)) reactionLog.delete(key);
  }

  /**
   * The last vote is broadcast as "all voted" first, so the last phone gets its throw animation and the
   * stage gets its ballot-box moment. Reveal follows after a short beat unless the operator acted first.
   */
  function scheduleAutoReveal(room: Room): void {
    const round = room.rounds.at(-1);
    if (revealTimers.has(room.code) || room.phase !== 'voting' || !round || !allVoted(round)) return;
    const timer = setTimeout(() => {
      revealTimers.delete(room.code);
      if (rooms.get(room.code) !== room) return;
      if (maybeAutoReveal(room, rng)) broadcast(room);
    }, revealDelayMs);
    revealTimers.set(room.code, timer);
  }

  function sweep(): void {
    for (const room of rooms.expired(now(), ROOM_TTL_MS)) closeRoom(room);
  }
  const sweepTimer = setInterval(sweep, options.sweepMs ?? 60_000);
  sweepTimer.unref();

  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData;

    const on = (event: string, handler: (payload: Payload) => Payload | void) => {
      socket.on(event, (payload: unknown, ack?: unknown) => {
        const reply = typeof ack === 'function' ? (ack as (res: AckResponse) => void) : () => undefined;
        try {
          const extra = handler(payload && typeof payload === 'object' ? (payload as Payload) : {});
          reply({ ok: true, ...(extra ?? {}) });
        } catch (error) {
          if (error instanceof GameError) {
            reply({ ok: false, code: error.code });
          } else {
            console.error(`handler failed: ${event}`, error);
            reply({ ok: false, code: 'INTERNAL' });
          }
        }
      });
    };

    const attach = (code: string, role: Role, playerId?: string) => {
      for (const joined of socket.rooms) if (joined !== socket.id) socket.leave(joined);
      data.code = code;
      data.role = role;
      data.playerId = playerId;
      if (role === 'stage') socket.join(stageRoom(code));
      else if (role === 'operator') socket.join(operatorRoom(code));
      else if (playerId) socket.join(playerRoom(code, playerId));
    };

    const asOperator = (): Room => {
      if (data.role !== 'operator' || !data.code) throw new GameError('UNAUTHORIZED');
      return requireRoom(data.code);
    };

    const asPlayer = (): { room: Room; playerId: string } => {
      if (data.role !== 'player' || !data.code || !data.playerId) throw new GameError('UNAUTHORIZED');
      return { room: requireRoom(data.code), playerId: data.playerId };
    };

    const operatorAction = (event: string, action: (room: Room, payload: Payload) => void) =>
      on(event, (payload) => {
        const room = asOperator();
        action(room, payload);
        broadcast(room);
      });

    on('room:create', () => {
      const room = createRoom(rooms.newCode(), randomUUID(), now());
      rooms.add(room);
      attach(room.code, 'operator');
      broadcast(room);
      return { code: room.code, operatorToken: room.operatorToken };
    });

    on('op:auth', ({ code, token }) => {
      const room = requireRoom(code);
      if (token !== room.operatorToken) throw new GameError('UNAUTHORIZED');
      attach(room.code, 'operator');
      broadcast(room);
    });

    on('stage:watch', ({ code }) => {
      const room = requireRoom(code);
      attach(room.code, 'stage');
      socket.emit('state', viewForStage(room));
    });

    on('player:join', ({ code, name }) => {
      const room = requireRoom(code);
      const player = joinRoom(room, String(name ?? ''), randomUUID(), randomUUID());
      attach(room.code, 'player', player.id);
      broadcast(room);
      return { playerId: player.id, token: player.token };
    });

    on('player:resume', ({ code, playerId, token }) => {
      const room = requireRoom(code);
      const player = findPlayer(room, String(playerId ?? ''));
      if (player.token !== token) throw new GameError('UNAUTHORIZED');
      player.connected = true;
      attach(room.code, 'player', player.id);
      broadcast(room);
    });

    on('player:vote', ({ targetId, reason, prediction }) => {
      const { room, playerId } = asPlayer();
      submitVote(
        room,
        playerId,
        { targetId: String(targetId ?? ''), reason: typeof reason === 'string' ? reason : '', prediction: Number(prediction) },
        randomUUID(),
        rng,
      );
      broadcast(room);
      scheduleAutoReveal(room);
    });

    on('player:react', ({ kind }) => {
      const { room, playerId } = asPlayer();
      if (room.phase !== 'reveal') throw new GameError('WRONG_PHASE');
      if (!REACTION_KINDS.includes(kind as ReactionKind)) throw new GameError('INVALID_REACTION');
      const key = `${room.code}:${playerId}`;
      const t = now();
      const recent = (reactionLog.get(key) ?? []).filter((at) => t - at < REACTION_WINDOW_MS);
      if (recent.length >= REACTIONS_PER_WINDOW) throw new GameError('RATE_LIMITED');
      recent.push(t);
      reactionLog.set(key, recent);
      io.to(stageRoom(room.code)).emit('reaction', { kind });
      if (kind === 'unfair') {
        try {
          protest(room, playerId);
          broadcast(room);
        } catch (error) {
          if (!(error instanceof GameError)) throw error;
        }
      }
    });

    operatorAction('op:start', (room) => startGame(room, now()));
    operatorAction('op:reveal', (room) => reveal(room, rng));
    operatorAction('op:showReasons', (room) => showReasons(room, rng));
    operatorAction('op:hideReason', (room, { reasonId }) => hideReason(room, String(reasonId ?? '')));
    operatorAction('op:next', (room) => nextRound(room));
    operatorAction('op:skip', (room) => skipQuestion(room));
    operatorAction('op:finish', (room) => finish(room, now()));
    operatorAction('op:rename', (room, { playerId, name }) => renamePlayer(room, String(playerId ?? ''), String(name ?? '')));
    operatorAction('op:admit', (room, { playerId }) => admitPlayer(room, String(playerId ?? '')));
    operatorAction('op:remove', (room, { playerId }) => {
      removePlayer(room, String(playerId ?? ''));
      scheduleAutoReveal(room);
    });
    on('op:end', () => {
      closeRoom(asOperator());
    });

    socket.on('disconnect', () => {
      if (data.role !== 'player' || !data.code || !data.playerId) return;
      const room = rooms.get(data.code);
      if (!room) return;
      const name = playerRoom(room.code, data.playerId);
      if ((io.sockets.adapter.rooms.get(name)?.size ?? 0) > 0) return; // another tab is still open
      const player = room.players.find((p) => p.id === data.playerId);
      if (!player) return;
      player.connected = false;
      broadcast(room);
    });
  });

  return {
    http,
    io,
    rooms,
    sweep,
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(sweepTimer);
        void io.close(() => resolve());
      }),
  };
}
