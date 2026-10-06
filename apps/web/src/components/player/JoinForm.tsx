'use client';

import { useState } from 'react';
import { NAME_MAX } from '@ojt/game';
import { Button } from '@/components/ui/Button';
import { textLength } from '@/lib/format';
import { messageFor } from '@/lib/messages';
import { call } from '@/lib/socket';
import { readJson, writeJson } from '@/lib/storage';

export interface PlayerCreds { playerId: string; token: string }

export function JoinForm({ code, onJoined }: { code: string; onJoined: (creds: PlayerCreds) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const length = textLength(name);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    // Same key on every retry: if an earlier attempt reached the server but its reply was lost,
    // the server hands back that player instead of creating a second one.
    const keyName = `joinKey:${code}`;
    // randomUUID needs a secure context; plain-http LAN testing falls back to a random string.
    const joinKey =
      readJson<string>(keyName) ?? crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    writeJson(keyName, joinKey);
    const res = await call<PlayerCreds>('player:join', { code, name, joinKey });
    setBusy(false);
    if (!res.ok) {
      setError(messageFor(res.code));
      return;
    }
    onJoined({ playerId: res.playerId, token: res.token });
  }

  return (
    <form onSubmit={submit} className="flex min-h-dvh flex-col gap-4 p-5">
      <div className="flex flex-1 flex-col justify-center gap-4">
        <h1 className="font-display text-4xl text-brand-deep">누가 가장 그럴까?</h1>
        <label htmlFor="name" className="text-lg font-bold">이름을 입력해 주세요</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          className="min-h-16 rounded-2xl border-2 border-gray-200 bg-white px-4 text-2xl focus:border-brand-deep"
        />
        <p className={`text-right text-sm ${length > NAME_MAX ? 'text-red-600' : 'text-muted'}`}>{length} / {NAME_MAX}</p>
        {error && <p role="alert" className="text-red-600">{error}</p>}
      </div>
      <Button type="submit" disabled={busy || length < 1 || length > NAME_MAX}>입장</Button>
    </form>
  );
}
