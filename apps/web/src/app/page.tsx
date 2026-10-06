'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { messageFor } from '@/lib/messages';
import { call } from '@/lib/socket';
import { writeJson } from '@/lib/storage';

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createRoom() {
    setBusy(true);
    setError(null);
    const res = await call<{ code: string; operatorToken: string }>('room:create');
    setBusy(false);
    if (!res.ok) {
      setError(messageFor(res.code));
      return;
    }
    writeJson(`op:${res.code}`, { token: res.operatorToken });
    router.push(`/op/${res.code}`);
  }

  function openStage(event: React.FormEvent) {
    event.preventDefault();
    if (/^\d{4}$/.test(code)) router.push(`/stage/${code}`);
    else setError('방 코드는 숫자 4자리예요.');
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-10 p-6">
      <h1 className="font-display text-4xl text-brand-deep">누가 가장 그럴까?</h1>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">운영자 (본인 폰)</h2>
        <Button onClick={createRoom} disabled={busy}>방 만들기</Button>
      </section>
      <form onSubmit={openStage} className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">무대 화면 (프로젝터 노트북)</h2>
        <input
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="방 코드 4자리"
          aria-label="방 코드"
          className="min-h-14 rounded-2xl border-2 border-gray-200 bg-white px-4 text-2xl tracking-widest focus:border-brand-deep"
        />
        <Button type="submit" variant="secondary">무대 화면 열기</Button>
      </form>
      {error && <p role="alert" className="text-red-600">{error}</p>}
    </main>
  );
}
