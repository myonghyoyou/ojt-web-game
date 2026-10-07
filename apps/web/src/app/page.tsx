'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { messageFor } from '@/lib/messages';
import { call } from '@/lib/socket';
import { writeJson } from '@/lib/storage';

const ROOM_NUMBER = /^\d{4}$/;
const digits = (value: string) => value.replace(/\D/g, '').slice(0, 4);

/** Participants who could not scan the QR land here, so joining by room number comes first. */
export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [stageCode, setStageCode] = useState('');
  const [hostError, setHostError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    if (!ROOM_NUMBER.test(joinCode)) {
      setJoinError('방 번호는 숫자 4자리예요.');
      return;
    }
    setBusy(true);
    setJoinError(null);
    const res = await call('room:exists', { code: joinCode });
    setBusy(false);
    if (!res.ok) {
      setJoinError(messageFor(res.code));
      return;
    }
    router.push(`/p/${joinCode}`);
  }

  async function createRoom() {
    setBusy(true);
    setHostError(null);
    const res = await call<{ code: string; operatorToken: string }>('room:create');
    setBusy(false);
    if (!res.ok) {
      setHostError(messageFor(res.code));
      return;
    }
    writeJson(`op:${res.code}`, { token: res.operatorToken });
    router.push(`/op/${res.code}`);
  }

  function openStage(event: React.FormEvent) {
    event.preventDefault();
    if (ROOM_NUMBER.test(stageCode)) router.push(`/stage/${stageCode}`);
    else setHostError('방 번호는 숫자 4자리예요.');
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-10 p-6">
      <h1 className="w-fit -rotate-2 rounded-2xl bg-sun px-5 py-2 font-display text-4xl text-night">누가 가장 그럴까?</h1>

      <form onSubmit={join} className="flex flex-col gap-3">
        <label htmlFor="join-code" className="text-xl font-bold">
          방 번호로 입장하기
        </label>
        <p className="text-muted">앞 화면에 보이는 숫자 4자리를 넣어 주세요.</p>
        <input
          id="join-code"
          inputMode="numeric"
          autoComplete="off"
          value={joinCode}
          onChange={(e) => setJoinCode(digits(e.target.value))}
          placeholder="0000"
          className="min-h-20 rounded-2xl border-[3px] border-night bg-white px-4 text-center text-5xl font-bold tracking-[0.4em] text-night placeholder:text-gray-300 focus:border-brand-deep"
        />
        {joinError && (
          <p role="alert" className="font-bold text-red-700">
            {joinError}
          </p>
        )}
        <Button type="submit" variant="ink" disabled={busy || joinCode.length < 4}>
          입장하기
        </Button>
      </form>

      <section className="flex flex-col gap-4 rounded-3xl bg-white p-5" aria-labelledby="host-title">
        <h2 id="host-title" className="text-lg font-bold">
          진행자용
        </h2>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">운영자 폰에서 새 게임을 만듭니다.</p>
          <Button variant="secondary" onClick={createRoom} disabled={busy}>
            방 만들기
          </Button>
        </div>
        <form onSubmit={openStage} className="flex flex-col gap-2">
          <label htmlFor="stage-code" className="text-sm text-muted">
            프로젝터에 연결한 노트북에서 방 번호로 화면을 엽니다.
          </label>
          <div className="flex flex-col gap-2">
            <input
              id="stage-code"
              inputMode="numeric"
              autoComplete="off"
              value={stageCode}
              onChange={(e) => setStageCode(digits(e.target.value))}
              placeholder="방 번호"
              className="min-h-12 rounded-2xl border-2 border-gray-200 bg-white px-4 text-xl tracking-widest text-night focus:border-brand-deep"
            />
            <Button type="submit" variant="secondary">
              프로젝터 화면 열기
            </Button>
          </div>
        </form>
        {hostError && (
          <p role="alert" className="font-bold text-red-700">
            {hostError}
          </p>
        )}
      </section>
    </main>
  );
}
