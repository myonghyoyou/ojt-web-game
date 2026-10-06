'use client';

import { motion } from 'motion/react';
import type { StageView } from '@ojt/game';
import { formatElapsed } from '@/lib/format';

export function StageFinal({ view }: { view: StageView }) {
  const titles = view.titles ?? [];
  const elapsed = view.startedAt !== null && view.endedAt !== null ? formatElapsed(view.endedAt - view.startedAt) : null;
  const credit = process.env.NEXT_PUBLIC_TEAM_CREDIT;

  return (
    <div className="flex h-full flex-col gap-10">
      <h1 className="font-display text-6xl text-brand-deep">오늘 우리가 본 서로의 이미지</h1>
      <ul className="grid flex-1 grid-cols-2 content-start gap-6" style={{ perspective: 1400 }}>
        {titles.map((t, i) => (
          <motion.li
            key={t.playerId}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.7, duration: 0.6, ease: 'easeOut' }}
            className="rounded-3xl bg-white p-8 shadow-sm"
          >
            <p className="text-3xl font-bold">{t.name}</p>
            <p className="mt-2 font-display text-4xl text-brand-deep">{t.title}</p>
            {t.note && <p className="mt-2 text-2xl text-muted">{t.note}</p>}
          </motion.li>
        ))}
      </ul>
      <footer className="flex justify-between text-xl text-muted">
        <span>{credit ?? ''}</span>
        <span>{elapsed ? `소요 시간 ${elapsed}` : ''}</span>
      </footer>
    </div>
  );
}
