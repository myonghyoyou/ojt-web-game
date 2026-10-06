'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { StageView } from '@ojt/game';
import { Progress } from './Progress';

export function StageVoting({ view }: { view: StageView }) {
  const round = view.round;
  if (!round) return null;
  const byId = new Map(view.players.map((p) => [p.id, p]));
  const waiting = round.eligibleIds.filter((id) => !round.votedIds.includes(id));
  const ratio = round.eligibleIds.length ? round.votedIds.length / round.eligibleIds.length : 0;

  return (
    <div className="flex h-full flex-col gap-10">
      <Progress number={round.number} total={round.total} />
      <div style={{ perspective: 1200 }}>
        <AnimatePresence mode="wait">
          <motion.h2
            key={round.question}
            initial={{ rotateX: 90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: -90, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-6xl leading-tight"
          >
            {round.question}
          </motion.h2>
        </AnimatePresence>
      </div>
      <div className="mt-auto grid grid-cols-[1fr_auto] items-end gap-12">
        <ul className="flex flex-wrap gap-4">
          {waiting.map((id) => {
            const last = waiting.length === 1;
            const player = byId.get(id);
            return (
              <motion.li
                key={id}
                layoutId={`ballot-${id}`}
                animate={last ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={last ? { repeat: Infinity, duration: 1.2 } : { type: 'spring' }}
                className={`rounded-2xl bg-white px-7 py-4 text-4xl font-bold shadow-sm ${last ? 'ring-4 ring-brand-sky' : ''} ${player?.connected === false ? 'opacity-40' : ''}`}
              >
                {player?.name}
              </motion.li>
            );
          })}
        </ul>
        <div className="relative flex h-72 w-96 flex-col overflow-hidden rounded-3xl border-4 border-brand-deep bg-white">
          <motion.div
            className="absolute inset-x-0 bottom-0 bg-brand-sky/25"
            initial={false}
            animate={{ height: `${ratio * 100}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
          <ul className="relative flex flex-wrap content-start gap-2 p-4">
            {round.votedIds.map((id) => (
              <motion.li
                key={id}
                layoutId={`ballot-${id}`}
                className="rounded-xl bg-brand-deep px-3 py-1 text-xl font-bold text-white"
              >
                ✓ {byId.get(id)?.name}
              </motion.li>
            ))}
          </ul>
          <p className="relative mt-auto p-4 text-right text-3xl font-bold text-brand-deep">
            {round.votedIds.length} / {round.eligibleIds.length}
          </p>
        </div>
      </div>
    </div>
  );
}
