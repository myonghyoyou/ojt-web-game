import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { ROOM_TTL_MS, type OperatorView, type PlayerView, type StageView } from '@ojt/game';
import { createApp, type App } from '../src/app';

type Ack = { ok: boolean; code?: string; [key: string]: unknown };

let app: App;
let url: string;
let clock = 0;
let sockets: Socket[] = [];

beforeEach(async () => {
  clock = 0;
  app = createApp({ origin: true, now: () => clock, rng: () => 0, revealDelayMs: 0 });
  await new Promise<void>((resolve) => app.http.listen(0, resolve));
  url = `http://localhost:${(app.http.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const s of sockets) s.disconnect();
  sockets = [];
  await app.close();
});

async function client(): Promise<Socket> {
  const socket = connect(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  sockets.push(socket);
  await new Promise<void>((resolve) => socket.on('connect', () => resolve()));
  return socket;
}

function call(socket: Socket, event: string, payload: object = {}): Promise<Ack> {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

function latest<T>(socket: Socket): { get: () => T | null } {
  let value: T | null = null;
  socket.on('state', (next: T) => {
    value = next;
  });
  return { get: () => value };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

async function setupGame(names = ['A', 'B', 'C', 'D']) {
  const op = await client();
  const created = await call(op, 'room:create');
  const code = created.code as string;
  const stage = await client();
  const stageState = latest<StageView>(stage);
  await call(stage, 'stage:watch', { code });
  const players = [];
  for (const name of names) {
    const socket = await client();
    const state = latest<PlayerView>(socket);
    const res = await call(socket, 'player:join', { code, name });
    players.push({ socket, state, id: res.playerId as string, token: res.token as string });
  }
  return { op, code, operatorToken: created.operatorToken as string, stage, stageState, players };
}

describe('realtime server', () => {
  it('answers health checks', async () => {
    const res = await fetch(`${url}/health`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  it('plays a round end to end and keeps votes anonymous', async () => {
    const g = await setupGame();
    expect((await call(g.op, 'op:start')).ok).toBe(true);
    const [a, b, c, d] = g.players;
    await call(a.socket, 'player:vote', { targetId: d.id, prediction: 0, reason: '준비성' });
    await call(b.socket, 'player:vote', { targetId: d.id, prediction: 0 });
    await call(c.socket, 'player:vote', { targetId: d.id, prediction: 0 });
    await call(d.socket, 'player:vote', { targetId: a.id, prediction: 0 });
    await settle();
    const stage = g.stageState.get();
    expect(stage?.phase).toBe('reveal');
    expect(stage?.result?.type).toBe('unanimous');
    expect(stage?.result?.reasons).toBeNull();
    expect(JSON.stringify(stage)).not.toContain('준비성');
    expect(JSON.stringify(stage)).not.toContain('predictions');
    expect(d.state.get()?.isTop).toBe(true);
  });

  it('tells a phone whether a room number exists before it asks for a name', async () => {
    const g = await setupGame(['A', 'B', 'C']);
    const phone = await client();
    expect(await call(phone, 'room:exists', { code: g.code })).toEqual({ ok: true });
    expect(await call(phone, 'room:exists', { code: '0000' === g.code ? '0001' : '0000' })).toEqual({ ok: false, code: 'ROOM_NOT_FOUND' });
    // Checking must not attach the socket to any role.
    expect(await call(phone, 'player:vote', { targetId: g.players[0].id, prediction: 0 })).toEqual({ ok: false, code: 'UNAUTHORIZED' });
  });

  it('rejects operator actions from non-operators', async () => {
    const g = await setupGame();
    expect(await call(g.players[0].socket, 'op:start')).toEqual({ ok: false, code: 'UNAUTHORIZED' });
  });

  it('restores the operator after a refresh but not with a wrong token', async () => {
    const g = await setupGame();
    g.op.disconnect();
    const intruder = await client();
    expect(await call(intruder, 'op:auth', { code: g.code, token: 'nope' })).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    const op2 = await client();
    const state = latest<OperatorView>(op2);
    expect((await call(op2, 'op:auth', { code: g.code, token: g.operatorToken })).ok).toBe(true);
    expect((await call(op2, 'op:start')).ok).toBe(true);
    await settle();
    expect(state.get()?.phase).toBe('voting');
  });

  it('brings a phone back as the same player after it sleeps', async () => {
    const g = await setupGame();
    await call(g.op, 'op:start');
    const a = g.players[0];
    await call(a.socket, 'player:vote', { targetId: g.players[1].id, prediction: 0 });
    a.socket.disconnect();
    await settle();
    expect(g.stageState.get()?.players.find((p) => p.id === a.id)?.connected).toBe(false);
    const again = await client();
    const state = latest<PlayerView>(again);
    expect((await call(again, 'player:resume', { code: g.code, playerId: a.id, token: a.token })).ok).toBe(true);
    await settle();
    expect(state.get()?.round?.hasVoted).toBe(true);
    expect(g.stageState.get()?.players.find((p) => p.id === a.id)?.connected).toBe(true);
  });

  it('shows "everyone voted" before revealing, so the last vote gets its moment', async () => {
    await app.close();
    app = createApp({ origin: true, now: () => clock, rng: () => 0, revealDelayMs: 300 });
    await new Promise<void>((resolve) => app.http.listen(0, resolve));
    url = `http://localhost:${(app.http.address() as AddressInfo).port}`;
    const g = await setupGame(['A', 'B', 'C']);
    await call(g.op, 'op:start');
    const [a, b, c] = g.players;
    await call(a.socket, 'player:vote', { targetId: b.id, prediction: 0 });
    await call(b.socket, 'player:vote', { targetId: a.id, prediction: 0 });
    await call(c.socket, 'player:vote', { targetId: a.id, prediction: 0 });
    await settle();
    expect(g.stageState.get()).toMatchObject({ phase: 'voting', round: { votedIds: [a.id, b.id, c.id] } });
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(g.stageState.get()?.phase).toBe('reveal');
  });

  it('returns the same player when a join is retried after a lost ack', async () => {
    const g = await setupGame(['A', 'B', 'C']);
    const phone = await client();
    const first = await call(phone, 'player:join', { code: g.code, name: 'D', joinKey: 'key-d' });
    const retry = await call(phone, 'player:join', { code: g.code, name: 'D', joinKey: 'key-d' });
    expect(retry).toEqual(first);
    await settle();
    expect(g.stageState.get()?.players.map((p) => p.name)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('attaches from the handshake so a vote sent right after reconnecting is accepted', async () => {
    const g = await setupGame();
    await call(g.op, 'op:start');
    const [a, b] = g.players;
    a.socket.disconnect();
    const again = connect(url, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      auth: { code: g.code, role: 'player', playerId: a.id, token: a.token },
    });
    sockets.push(again);
    const res = await new Promise<Ack>((resolve) =>
      again.emit('player:vote', { targetId: b.id, prediction: 0 }, resolve),
    );
    expect(res).toEqual({ ok: true });
  });

  it('ignores a handshake with a wrong token', async () => {
    const g = await setupGame();
    const intruder = connect(url, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      auth: { code: g.code, role: 'operator', token: 'nope' },
    });
    sockets.push(intruder);
    expect(await new Promise<Ack>((resolve) => intruder.emit('op:start', {}, resolve))).toEqual({ ok: false, code: 'UNAUTHORIZED' });
  });

  it('handles the last two votes arriving together', async () => {
    const g = await setupGame();
    await call(g.op, 'op:start');
    const [a, b, c, d] = g.players;
    await call(a.socket, 'player:vote', { targetId: b.id, prediction: 0 });
    await call(b.socket, 'player:vote', { targetId: a.id, prediction: 0 });
    const both = await Promise.all([
      call(c.socket, 'player:vote', { targetId: a.id, prediction: 0 }),
      call(d.socket, 'player:vote', { targetId: a.id, prediction: 0 }),
    ]);
    expect(both.every((r) => r.ok)).toBe(true);
    await settle();
    const result = g.stageState.get()?.result;
    expect(result?.counts.reduce((sum, x) => sum + x.votes, 0)).toBe(4);
    expect(result?.topIds).toEqual([a.id]);
  });

  it('forwards reactions to the stage with a rate limit', async () => {
    const g = await setupGame();
    await call(g.op, 'op:start');
    const [a, b, c, d] = g.players;
    expect(await call(a.socket, 'player:react', { kind: 'lol' })).toEqual({ ok: false, code: 'WRONG_PHASE' });
    for (const p of [a, b, c]) await call(p.socket, 'player:vote', { targetId: d.id, prediction: 0 });
    await call(d.socket, 'player:vote', { targetId: a.id, prediction: 0 });
    await settle(); // the automatic reveal runs on a timer, even when the delay is 0
    const seen: string[] = [];
    g.stage.on('reaction', (r: { kind: string }) => seen.push(r.kind));
    expect((await call(a.socket, 'player:react', { kind: 'lol' })).ok).toBe(true);
    expect((await call(a.socket, 'player:react', { kind: 'agree' })).ok).toBe(true);
    expect(await call(a.socket, 'player:react', { kind: 'lol' })).toEqual({ ok: false, code: 'RATE_LIMITED' });
    expect(await call(b.socket, 'player:react', { kind: 'boo' })).toEqual({ ok: false, code: 'INVALID_REACTION' });
    expect((await call(d.socket, 'player:react', { kind: 'unfair' })).ok).toBe(true);
    await settle();
    expect(seen).toEqual(['lol', 'agree', 'unfair']);
    expect(g.stageState.get()?.result?.protestedIds).toEqual([d.id]);
  });

  it('deletes the room when the operator ends the game', async () => {
    const g = await setupGame(['A', 'B', 'C']);
    let closed = 0;
    for (const s of [g.stage, ...g.players.map((p) => p.socket)]) s.on('closed', () => { closed += 1; });
    expect((await call(g.op, 'op:end')).ok).toBe(true);
    await settle();
    expect(closed).toBe(4);
    const late = await client();
    expect(await call(late, 'stage:watch', { code: g.code })).toEqual({ ok: false, code: 'ROOM_NOT_FOUND' });
  });

  it('expires rooms two hours after creation', async () => {
    const g = await setupGame(['A', 'B', 'C']);
    clock = ROOM_TTL_MS + 1;
    app.sweep();
    expect(app.rooms.get(g.code)).toBeUndefined();
  });
});
