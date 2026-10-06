'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { StageView } from '@ojt/game';
import { colorStyle, playerColor } from '@/lib/colors';
import { StageTopBar } from './Progress';

const ORDINALS = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
const TITLE_CARD_MS = 1400;

/** Round title card, then the question with live progress. The narration bar is the "host" voice. */
export function StageVoting({ view }: { view: StageView }) {
  const round = view.round;
  const roundKey = round ? `${round.number}-${round.question}` : '';
  const [titleFor, setTitleFor] = useState(roundKey);

  useEffect(() => {
    setTitleFor(roundKey);
    const timer = setTimeout(() => setTitleFor(''), TITLE_CARD_MS);
    return () => clearTimeout(timer);
  }, [roundKey]);

  if (!round) return null;
  const byId = new Map(view.players.map((p) => [p.id, p]));
  const waiting = round.eligibleIds.filter((id) => !round.votedIds.includes(id));
  const total = round.eligibleIds.length;
  const voted = round.votedIds.length;
  const isLast = round.number === round.total;
  const narration =
    waiting.length === 0
      ? '다 찍었어요. 결과 볼게요.'
      : voted === 0
        ? '폰에서 한 명 골라 주세요.'
        : `${voted}명 찍었어요 · ${waiting.length}명 남았어요`;

  return (
    <div className="relative flex h-full flex-col">
      <AnimatePresence>
        {titleFor === roundKey && (
          <motion.div
            key={`title-${roundKey}`}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-sun text-night"
            initial={{ clipPath: 'circle(0% at 50% 50%)' }}
            animate={{ clipPath: 'circle(150% at 50% 50%)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <p className="text-4xl font-bold">{round.total}문제 중</p>
            <p className="font-display text-[11rem] leading-none">
              {isLast ? '마지막 질문' : `${ORDINALS[round.number - 1] ?? round.number} 번째 질문`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-14 pt-10">
        <StageTopBar number={round.number} total={round.total} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-12 px-20">
        <motion.h2
          key={round.question}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 16, delay: TITLE_CARD_MS / 1000 }}
          className="max-w-7xl text-center font-display text-7xl leading-tight"
        >
          {round.question}
        </motion.h2>

        <BallotRing votedColors={round.votedIds.map((id) => byId.get(id)?.color ?? 0)} total={total} />

        <ul className="flex flex-wrap justify-center gap-5">
          {round.eligibleIds.map((id) => {
            const p = byId.get(id);
            const done = round.votedIds.includes(id);
            const last = !done && waiting.length === 1;
            return (
              <motion.li
                key={id}
                layout
                animate={done ? { y: -16, scale: 1 } : last ? { y: 0, scale: [1, 1.08, 1] } : { y: 0, scale: 1 }}
                transition={last ? { repeat: Infinity, duration: 1.1 } : { type: 'spring', stiffness: 500, damping: 14 }}
                className={`flex items-center gap-3 rounded-full px-8 py-4 text-4xl font-bold ${
                  done ? 'shadow-[0_12px_0_rgba(0,0,0,0.25)]' : 'outline-4 outline-offset-4 outline-white/80 outline-dashed'
                } ${p?.connected === false ? 'opacity-45' : ''}`}
                style={colorStyle(p?.color ?? 0)}
              >
                {done && <span aria-label="투표 완료">✓</span>}
                {p?.name}
              </motion.li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center justify-between bg-stage-deep px-14 py-6 text-3xl font-bold">
        <motion.span key={narration} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          {narration}
        </motion.span>
        <span className="text-white/80">
          {voted} / {total}
        </span>
      </div>
    </div>
  );
}

/** A ring split into one slot per voter; filled slots take the voters' colors (who voted is public, whom they chose is not). */
function BallotRing({ votedColors, total }: { votedColors: number[]; total: number }) {
  const size = 150;
  const r = 60;
  const c = 2 * Math.PI * r;
  const gap = total > 1 ? 10 : 0;
  const seg = total > 0 ? c / total : c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
      {Array.from({ length: total }, (_, i) => {
        const color = votedColors[i];
        return (
          <motion.circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={22}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(seg - gap, 1)} ${c}`}
            strokeDashoffset={-i * seg}
            initial={false}
            animate={{ stroke: color === undefined ? 'rgba(255,255,255,0.22)' : playerColor(color).bg }}
            transition={{ duration: 0.35 }}
          />
        );
      })}
    </svg>
  );
}
