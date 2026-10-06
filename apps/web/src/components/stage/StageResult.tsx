'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { StageView } from '@ojt/game';

const STEP_TIMES_MS = [1000, 4000, 5500];

export function StageResult({ view }: { view: StageView }) {
  const { round, result } = view;
  const [step, setStep] = useState(0);
  const roundKey = round ? `${round.number}-${round.question}` : '';

  useEffect(() => {
    setStep(0);
    const timers = STEP_TIMES_MS.map((ms, i) => setTimeout(() => setStep(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [roundKey]);

  if (!round || !result) return null;
  const nameOf = (id: string) => view.players.find((p) => p.id === id)?.name ?? '';
  const max = Math.max(1, ...result.counts.map((c) => c.votes));
  const protesters = result.protestedIds.map(nameOf);

  return (
    <div className="flex h-full flex-col gap-8">
      <p className="text-2xl font-bold text-brand-mid">Q{round.number} / {round.total} 결과</p>
      <h2 className="font-display text-5xl leading-tight">{round.question}</h2>

      <ul className="flex flex-col gap-4">
        {result.counts.map(({ playerId, votes }) => {
          const top = result.topIds.includes(playerId);
          return (
            <li key={playerId} className={`grid grid-cols-[20rem_1fr_7rem] items-center gap-6 ${votes === 0 ? 'opacity-40' : ''}`}>
              <span className={`flex items-center gap-3 text-4xl ${top ? 'font-bold text-brand-deep' : ''}`}>
                {nameOf(playerId)}
                {top && step >= 2 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    className="rounded-full bg-brand-deep px-3 py-1 text-2xl text-white"
                  >
                    1위
                  </motion.span>
                )}
              </span>
              <div className="h-12 overflow-hidden rounded-full bg-white">
                <motion.div
                  className={`h-full rounded-full ${top ? 'bg-brand-deep' : 'bg-brand-sky'}`}
                  initial={{ width: 0 }}
                  animate={{ width: step >= 1 ? `${(votes / max) * 100}%` : 0 }}
                  transition={{ duration: top ? 1.4 : 0.9, delay: top ? 0.6 : 0, ease: 'easeOut' }}
                />
              </div>
              <span className="text-right text-4xl font-bold">{step >= 1 ? `${votes}표` : ''}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-4">
        <AnimatePresence>
          {step >= 2 && (
            <motion.p key="comment" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-5xl text-brand-deep">
              {result.comment}
            </motion.p>
          )}
          {step >= 3 && result.prediction && (
            <motion.p key="prediction" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl">
              {nameOf(result.prediction.playerId)}: 예상 {result.prediction.predicted}표 → 실제 {result.prediction.actual}표{' '}
              <span className="font-bold text-brand-mid">{result.prediction.comment}</span>
            </motion.p>
          )}
          {result.reasons && result.reasons.length > 0 && (
            <motion.ul key="reasons" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-4">
              {result.reasons.map((text, i) => (
                <li key={`${i}-${text}`} className="rounded-2xl bg-white px-6 py-4 text-3xl shadow-sm">
                  “{text}”
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-8 flex justify-center">
        <AnimatePresence>
          {protesters.length > 0 && (
            <motion.div
              key="protest"
              initial={{ y: -120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="rounded-full bg-brand-deep px-10 py-4 font-display text-4xl text-white"
            >
              {protesters.join(', ')} 님, 억울함을 표명했습니다
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
