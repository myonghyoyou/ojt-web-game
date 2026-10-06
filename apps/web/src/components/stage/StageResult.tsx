'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { StageView } from '@ojt/game';
import { colorStyle, playerColor } from '@/lib/colors';
import { StageTopBar } from './Progress';

/**
 * Reveal order, all inside the 10-second budget (PRD 5):
 * the other players' counts appear one by one, a drumroll caption holds the beat,
 * then the winner's color floods the screen with the name, the comment caption,
 * and the prediction twist. Reasons and protests arrive later from the operator and players.
 */
const LOSER_STAGGER_MS = 350;
const DRUM_MS = 900;
const COMMENT_AFTER_FLOOD_MS = 1000;
const PREDICTION_AFTER_COMMENT_MS = 1200;

type Step = 'losers' | 'drum' | 'flood' | 'comment' | 'prediction';

export function StageResult({ view }: { view: StageView }) {
  const { round, result } = view;
  const roundKey = round ? `${round.number}-${round.question}` : '';
  const others = result ? result.counts.filter((c) => !result.topIds.includes(c.playerId)).sort((a, b) => a.votes - b.votes) : [];
  const losersMs = 300 + others.length * LOSER_STAGGER_MS;
  const [step, setStep] = useState<Step>('losers');

  useEffect(() => {
    setStep('losers');
    const floodAt = losersMs + DRUM_MS;
    const timers = [
      setTimeout(() => setStep('drum'), losersMs),
      setTimeout(() => setStep('flood'), floodAt),
      setTimeout(() => setStep('comment'), floodAt + COMMENT_AFTER_FLOOD_MS),
      setTimeout(() => setStep('prediction'), floodAt + COMMENT_AFTER_FLOOD_MS + PREDICTION_AFTER_COMMENT_MS),
    ];
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the round changes
  }, [roundKey]);

  if (!round || !result) return null;
  const byId = new Map(view.players.map((p) => [p.id, p]));
  const nameOf = (id: string) => byId.get(id)?.name ?? '';
  const colorIndexOf = (id: string) => byId.get(id)?.color ?? 0;
  const topVotes = result.counts.find((c) => result.topIds.includes(c.playerId))?.votes ?? 0;
  const flooded = step === 'flood' || step === 'comment' || step === 'prediction';
  const protesters = result.protestedIds.map(nameOf);

  return (
    <div className="relative flex h-full flex-col">
      <div className="px-14 pt-10">
        <StageTopBar number={round.number} total={round.total} />
      </div>
      <p className="mt-8 px-14 text-center font-display text-5xl leading-tight text-white/90">{round.question}</p>

      {/* Others, lowest first */}
      <ul className="mt-auto mb-16 flex flex-wrap justify-center gap-5 px-14">
        {others.map((c, i) => (
          <motion.li
            key={c.playerId}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: c.votes === 0 ? 0.55 : 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.3 + (i * LOSER_STAGGER_MS) / 1000 }}
            className="flex items-center gap-4 rounded-full px-8 py-4 text-4xl font-bold"
            style={colorStyle(colorIndexOf(c.playerId))}
          >
            {nameOf(c.playerId)}
            <span className="rounded-full bg-night/15 px-3 py-0.5 text-3xl tabular-nums">{c.votes}표</span>
          </motion.li>
        ))}
      </ul>

      <AnimatePresence>
        {step === 'drum' && (
          <motion.p
            key="drum"
            className="caption absolute inset-x-0 top-[42%] text-center text-9xl"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, rotate: [0, -3, 3, -3, 3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            두구두구두구
          </motion.p>
        )}
      </AnimatePresence>

      {flooded && (
        <motion.div
          className="absolute inset-0 z-10 grid"
          style={{ gridTemplateColumns: `repeat(${result.topIds.length}, minmax(0, 1fr))` }}
          initial={{ clipPath: 'circle(0% at 50% 55%)' }}
          animate={{ clipPath: 'circle(150% at 50% 55%)' }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {result.topIds.map((id) => (
            <div key={id} className="flex flex-col items-center justify-center gap-4 px-6" style={colorStyle(colorIndexOf(id))}>
              <p className="text-4xl font-bold">
                {result.topIds.length > 1 ? '공동 1위' : '1위'} · {topVotes}표
              </p>
              <motion.p
                className={`text-center font-bold leading-none ${result.topIds.length > 2 ? 'text-8xl' : 'text-[12rem]'}`}
                initial={{ scale: 2.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.35 }}
              >
                {nameOf(id)}
              </motion.p>
            </div>
          ))}
        </motion.div>
      )}

      {flooded && others.length > 0 && (
        <motion.ul
          className="pointer-events-none absolute inset-x-0 top-12 z-20 flex flex-wrap justify-center gap-3 px-14"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          aria-label="나머지 득표"
        >
          {others.map((c) => (
            <li key={c.playerId} className="rounded-full bg-white/85 px-5 py-1.5 text-2xl font-bold text-night tabular-nums">
              {nameOf(c.playerId)} {c.votes}표
            </li>
          ))}
        </motion.ul>
      )}

      {flooded && (
        <div className="pointer-events-none absolute inset-x-0 bottom-14 z-20 flex flex-col items-center gap-5 px-14">
          <AnimatePresence>
            {(step === 'comment' || step === 'prediction') && (
              <motion.p
                key="comment"
                className="caption -rotate-2 text-center text-7xl"
                initial={{ y: 40, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 16 }}
              >
                {result.comment}
              </motion.p>
            )}
            {step === 'prediction' && result.prediction && (
              <motion.p
                key="prediction"
                className="rounded-full bg-night px-8 py-3 text-3xl text-white"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                <span className="font-bold">{nameOf(result.prediction.playerId)}</span>: 예상 {result.prediction.predicted}표 → 실제{' '}
                {result.prediction.actual}표 <span className="font-bold text-sun">{result.prediction.comment}</span>
              </motion.p>
            )}
            {result.reasons && result.reasons.length > 0 && (
              <motion.ul key="reasons" className="flex flex-wrap justify-center gap-4" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                {result.reasons.map((text, i) => (
                  <li key={`${i}-${text}`} className="rotate-1 rounded-2xl bg-white px-6 py-4 text-3xl text-night shadow-[0_8px_0_rgba(0,0,0,0.2)]">
                    “{text}”
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-32 z-30 flex justify-center">
        <AnimatePresence>
          {flooded && protesters.length > 0 && (
            <motion.div
              key="protest"
              initial={{ y: -80, opacity: 0, rotate: -8 }}
              animate={{ y: 0, opacity: 1, rotate: 4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 14 }}
              className="relative rounded-full border-4 border-night bg-white px-10 py-4 text-4xl font-bold text-night"
            >
              {protesters.join(', ')} 님 <span className="font-display" style={{ color: playerColor(4).bg }}>(억울)</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
