'use client';

import { useEffect, useState } from 'react';
import type { OperatorView } from '@ojt/game';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { messageFor } from '@/lib/messages';
import { call } from '@/lib/socket';
import { readJson, removeKey, writeJson } from '@/lib/storage';
import { useRoomState } from '@/lib/useRoomState';
import { PlayerAdmin } from './PlayerAdmin';

const PHASE_LABEL = { lobby: '입장 대기', voting: '투표 중', reveal: '결과', final: '최종 결과' } as const;

export function OperatorScreen({ code }: { code: string }) {
  const storageKey = `op:${code}`;
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    // A recovery link (/op/<code>#<token>) moves operator rights to this device.
    const fromLink = window.location.hash.slice(1);
    if (fromLink) {
      writeJson(storageKey, { token: fromLink });
      window.history.replaceState(null, '', window.location.pathname);
    }
    setToken(fromLink || readJson<{ token: string }>(storageKey)?.token || null);
  }, [storageKey]);
  const [copied, setCopied] = useState(false);

  const { view, closed, error, setError } = useRoomState<OperatorView>(
    `${storageKey}:${token ?? ''}`,
    token ? () => call('op:auth', { code, token }) : null,
  );
  const [busy, setBusy] = useState(false);

  async function act(event: string, payload: object = {}, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    const res = await call(event, payload);
    setBusy(false);
    setError(res.ok ? null : res.code);
    if (res.ok && event === 'op:end') removeKey(storageKey);
  }

  if (token === undefined) return <Notice>운영자 권한을 확인하는 중</Notice>;
  if (token === null) return <Notice title="운영자 권한 없음">방을 만든 폰에서 열거나, 그 폰에서 복사한 운영자 링크로 열어 주세요.</Notice>;
  if (closed) return <Notice title="게임 종료">방 데이터가 삭제됐습니다.</Notice>;
  if (!view) return <Notice>{error ? messageFor(error) : '서버에 연결하는 중'}</Notice>;

  const { round, result } = view;
  const active = view.players.filter((p) => p.status === 'active');
  const pending = view.players.filter((p) => p.status === 'pending');
  const nameOf = (id: string) => view.players.find((p) => p.id === id)?.name ?? '';
  const playing = view.phase === 'voting' || view.phase === 'reveal';
  const recoveryLink = `${window.location.origin}/op/${view.code}#${token}`;

  async function copyRecoveryLink() {
    try {
      await navigator.clipboard.writeText(recoveryLink);
      setCopied(true);
    } catch {
      setCopied(false);
      window.prompt('아래 링크를 길게 눌러 복사해 주세요', recoveryLink);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4 pb-64">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">방 {view.code}</h1>
        <span className="rounded-full bg-brand-sky/15 px-3 py-1 text-sm font-bold text-brand-deep">
          {PHASE_LABEL[view.phase]}
          {round ? ` · Q${round.number}/${round.total}` : ''}
        </span>
      </header>

      {view.phase === 'lobby' && (
        <section className="rounded-2xl bg-white p-4">
          <p className="text-muted">노트북에서 이 사이트 첫 화면을 열고, 방 코드 칸에 아래 숫자를 넣으면 무대 화면이 열립니다.</p>
          <p className="mt-2 text-4xl font-bold tracking-widest text-ink">{view.code}</p>
        </section>
      )}

      {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-red-700">{messageFor(error)}</p>}

      {playing && active.length < 3 && (
        <p role="alert" className="rounded-2xl bg-amber-50 p-3 text-amber-800">
          참가자가 {active.length}명뿐이에요. 투표가 의미 없어지니 조기 종료를 권장합니다.
        </p>
      )}

      {pending.length > 0 && (
        <section className="rounded-2xl bg-white p-4">
          <h2 className="mb-2 font-bold">입장 대기</h2>
          <ul className="flex flex-col gap-2">
            {pending.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <span className="flex-1 text-lg">{p.name}</span>
                <Button className="w-auto" variant="secondary" disabled={busy} onClick={() => act('op:admit', { playerId: p.id })}>
                  입장 허용
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {round && (
        <section className="rounded-2xl bg-white p-4">
          <p className="text-sm text-muted">현재 질문</p>
          <p className="mt-1 text-lg font-bold">{round.question}</p>
        </section>
      )}

      {view.phase === 'voting' && round && (
        <section className="rounded-2xl bg-white p-4">
          <h2 className="mb-2 font-bold">투표 {round.votedIds.length} / {round.eligibleIds.length}</h2>
          <ul className="grid grid-cols-2 gap-2">
            {round.eligibleIds.map((id) => (
              <li key={id} className={round.votedIds.includes(id) ? 'font-bold text-brand-deep' : 'text-muted'}>
                {round.votedIds.includes(id) ? '✓ ' : '· '}
                {nameOf(id)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.phase === 'reveal' && result && (
        <section className="rounded-2xl bg-white p-4">
          <h2 className="mb-2 font-bold">결과 · {result.comment}</h2>
          <ul className="mb-4">
            {[...result.counts].sort((a, b) => b.votes - a.votes).map((c) => (
              <li key={c.playerId} className={result.topIds.includes(c.playerId) ? 'font-bold text-brand-deep' : ''}>
                {nameOf(c.playerId)} {c.votes}표
              </li>
            ))}
          </ul>
          <h3 className="mb-1 font-bold">1위에게 달린 이유 (공개 전 확인)</h3>
          {view.reasons.length === 0 && <p className="text-muted">이번 1위에게 달린 이유가 없어요.</p>}
          <ul className="flex flex-col gap-2">
            {view.reasons.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <span className={`flex-1 ${r.hidden ? 'text-muted line-through' : ''}`}>
                  {r.targetName}: {r.text}
                </span>
                <button
                  type="button"
                  className="min-h-12 px-3 text-red-600 disabled:text-muted"
                  disabled={busy || r.hidden}
                  onClick={() => act('op:hideReason', { reasonId: r.id })}
                >
                  {r.hidden ? '숨김' : '숨기기'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.phase !== 'final' && (
        <details className="rounded-2xl bg-white p-4">
          <summary className="min-h-12 cursor-pointer content-center font-bold">이 폰을 쓸 수 없게 되면</summary>
          <p className="mt-2 text-muted">
            운영자 링크를 다른 기기에서 열면 그 기기가 운영자가 됩니다. 무대 화면이나 단체 채팅방에는 올리지 마세요.
          </p>
          <Button className="mt-3" variant="secondary" onClick={copyRecoveryLink}>
            {copied ? '운영자 링크를 복사했어요' : '운영자 링크 복사'}
          </Button>
        </details>
      )}

      {view.phase === 'final' && view.titles && (
        <section className="rounded-2xl bg-white p-4">
          <h2 className="mb-2 font-bold">최종 칭호</h2>
          <ul>
            {view.titles.map((t) => (
              <li key={t.playerId}>
                {t.name}: {t.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.phase !== 'final' && (
        <PlayerAdmin
          players={active}
          disabled={busy}
          onRename={(playerId, name) => act('op:rename', { playerId, name })}
          onRemove={(playerId, name) => act('op:remove', { playerId }, `${name} 님을 참가 목록에서 제외할까요?`)}
        />
      )}

      <footer className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-4">
        <div className="mx-auto flex max-w-md flex-col gap-2">
          {view.phase === 'lobby' && (
            <>
              <p className="text-center text-sm text-muted">{active.length}명 입장 · 최소 3명</p>
              <Button disabled={busy || active.length < 3} onClick={() => act('op:start')}>시작</Button>
            </>
          )}
          {view.phase === 'voting' && round && (
            <>
              <Button disabled={busy || round.votedIds.length === 0} onClick={() => act('op:reveal')}>결과 공개</Button>
              <Button
                variant="secondary"
                disabled={busy || view.spareLeft === 0}
                onClick={() => act('op:skip', {}, '이 문제를 예비 문제로 바꿀까요? 이미 들어온 투표는 사라집니다.')}
              >
                이 문제 건너뛰기 (예비 {view.spareLeft})
              </Button>
            </>
          )}
          {view.phase === 'reveal' && result && (
            <>
              <Button
                variant="secondary"
                disabled={busy || result.reasons !== null || view.reasons.every((r) => r.hidden)}
                onClick={() => act('op:showReasons')}
              >
                {result.reasons !== null ? '이유 공개됨' : '이유 보기'}
              </Button>
              {view.isLastRound ? (
                <Button disabled={busy} onClick={() => act('op:finish')}>최종 결과 보기</Button>
              ) : (
                <Button disabled={busy} onClick={() => act('op:next')}>다음 문제</Button>
              )}
            </>
          )}
          {playing && (
            <Button variant="danger" disabled={busy} onClick={() => act('op:finish', {}, '지금까지의 결과로 최종 화면으로 갈까요?')}>
              조기 종료
            </Button>
          )}
          {view.phase === 'final' && (
            <Button variant="danger" disabled={busy} onClick={() => act('op:end', {}, '게임을 종료하고 방 데이터를 삭제할까요?')}>
              게임 종료
            </Button>
          )}
        </div>
      </footer>
    </main>
  );
}
