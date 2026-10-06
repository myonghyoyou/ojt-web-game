'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { REASON_MAX, type PlayerRoundInfo } from '@ojt/game';
import { Button } from '@/components/ui/Button';
import { colorStyle } from '@/lib/colors';
import { textLength } from '@/lib/format';
import { messageFor } from '@/lib/messages';
import { call } from '@/lib/socket';

type Step = 'pick' | 'reason' | 'predict';

/** Keyed by round in the parent, so state resets per question. Its exit animation is the "throw": it flies up when the vote lands. */
export function VoteFlow({ round }: { round: PlayerRoundInfo }) {
  const [step, setStep] = useState<Step>('pick');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [prediction, setPrediction] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const target = round.candidates.find((c) => c.id === targetId);
  const reasonLength = textLength(reason);

  async function send() {
    if (!targetId || prediction === null) return;
    setSending(true);
    setError(null);
    const res = await call('player:vote', { targetId, reason, prediction });
    setSending(false);
    if (!res.ok) {
      setError(messageFor(res.code));
      return;
    }
    navigator.vibrate?.(30);
  }

  return (
    <motion.div
      className="flex min-h-dvh flex-col gap-5 bg-inherit p-5 pb-44"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ y: -900, opacity: 0, transition: { duration: 0.55, ease: 'easeIn' } }}
    >
      <p className="text-sm font-bold">Q{round.number} / {round.total}</p>
      <h1 className="font-display text-2xl leading-snug">{round.question}</h1>

      {step === 'pick' && (
        <ul className="grid grid-cols-2 gap-3">
          {round.candidates.map((c) => {
            const selected = c.id === targetId;
            return (
              <li key={c.id}>
                <motion.button
                  type="button"
                  onClick={() => setTargetId(c.id)}
                  animate={{ scale: selected ? 1.06 : 1, y: selected ? -8 : 0, rotate: selected ? -2 : 0, opacity: targetId && !selected ? 0.45 : 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className={`min-h-24 w-full rounded-3xl text-2xl font-bold shadow-[0_6px_0_rgba(0,0,0,0.18)] ${selected ? 'outline-4 outline-night' : ''}`}
                  style={colorStyle(c.color)}
                  aria-pressed={selected}
                >
                  {c.name}
                </motion.button>
              </li>
            );
          })}
        </ul>
      )}

      {step === 'reason' && target && (
        <div className="flex flex-col gap-2">
          <label htmlFor="reason" className="text-lg font-bold">{target.name} 님을 고른 이유 (선택)</label>
          <input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 평소에도 뭔가 하나씩 빠뜨림"
            autoComplete="off"
            className="min-h-14 rounded-2xl border-2 border-gray-200 bg-white px-4 text-lg text-night focus:border-brand-deep"
          />
          <p className={`text-right text-sm font-bold ${reasonLength > REASON_MAX ? 'rounded bg-white px-2 text-red-700' : ''}`}>
            {reasonLength} / {REASON_MAX}
          </p>
        </div>
      )}

      {step === 'predict' && (
        <div className="flex flex-col gap-3">
          <p className="text-lg font-bold">나는 몇 표 받을 것 같나요?</p>
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: round.maxPrediction + 1 }, (_, n) => (
              <motion.button
                key={n}
                type="button"
                onClick={() => setPrediction(n)}
                animate={prediction === n ? { scale: [1, 1.25, 1], y: [0, -10, 0] } : { scale: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className={`min-h-16 rounded-2xl text-3xl font-bold ${prediction === n ? 'bg-night text-white' : 'bg-white text-night shadow-sm'}`}
                aria-pressed={prediction === n}
              >
                {n}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {error && <p role="alert" className="rounded-xl bg-white p-3 font-bold text-red-700">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 flex flex-col gap-2 bg-inherit p-5">
        {step === 'pick' && (
          <Button variant="ink" disabled={!targetId} onClick={() => setStep('reason')}>다음</Button>
        )}
        {step === 'reason' && (
          <>
            <Button variant="ink" disabled={reasonLength > REASON_MAX} onClick={() => setStep('predict')}>
              {reasonLength > 0 ? '다음' : '건너뛰기'}
            </Button>
            <Button variant="ghost" onClick={() => setStep('pick')}>뒤로</Button>
          </>
        )}
        {step === 'predict' && (
          <>
            <Button variant="ink" disabled={prediction === null || sending} onClick={send}>보내기</Button>
            <Button variant="ghost" onClick={() => setStep('reason')}>뒤로</Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
