'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { StageView } from '@ojt/game';
import { colorStyle } from '@/lib/colors';
import { formatElapsed } from '@/lib/format';

const SPOTLIGHT_MS = 2200;

/** Each player gets a full-screen moment in their own color, then everyone gathers in one mosaic. */
export function StageFinal({ view }: { view: StageView }) {
  const titles = view.titles ?? [];
  const [spot, setSpot] = useState(0);
  const byId = new Map(view.players.map((p) => [p.id, p]));
  const elapsed = view.startedAt !== null && view.endedAt !== null ? formatElapsed(view.endedAt - view.startedAt) : null;
  const credit = process.env.NEXT_PUBLIC_TEAM_CREDIT;

  useEffect(() => {
    if (spot >= titles.length) return;
    const timer = setTimeout(() => setSpot((s) => s + 1), SPOTLIGHT_MS);
    return () => clearTimeout(timer);
  }, [spot, titles.length]);

  const current = titles[spot];
  const colorOf = (id: string) => byId.get(id)?.color ?? 0;

  return (
    <div className="relative flex h-full flex-col gap-8 p-14">
      <h1 className="caption -rotate-1 text-7xl">오늘 우리가 본 서로의 이미지</h1>

      <AnimatePresence mode="wait">
        {current ? (
          <motion.div
            key={current.playerId}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 px-16 text-center"
            style={colorStyle(colorOf(current.playerId))}
            initial={{ clipPath: 'circle(0% at 50% 50%)' }}
            animate={{ clipPath: 'circle(150% at 50% 50%)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <p className="text-5xl font-bold">{current.name}</p>
            <motion.p
              className="font-display text-9xl leading-tight"
              initial={{ scale: 1.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.3 }}
            >
              {current.title}
            </motion.p>
            {current.note && <p className="text-4xl font-medium">{current.note}</p>}
          </motion.div>
        ) : (
          <motion.ul
            key="mosaic"
            className={`grid flex-1 content-center gap-6 ${titles.length > 4 ? 'grid-cols-4' : 'grid-cols-2'}`}
            initial="hidden"
            animate="shown"
            variants={{ shown: { transition: { staggerChildren: 0.12 } } }}
          >
            {titles.map((t, i) => (
              <motion.li
                key={t.playerId}
                variants={{ hidden: { y: 60, opacity: 0, rotate: 0 }, shown: { y: 0, opacity: 1, rotate: i % 2 ? 1.5 : -1.5 } }}
                transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                className="flex flex-col gap-2 rounded-4xl p-8 shadow-[0_14px_0_rgba(0,0,0,0.22)]"
                style={colorStyle(colorOf(t.playerId))}
              >
                <p className="text-3xl font-bold">{t.name}</p>
                <p className="font-display text-5xl leading-tight">{t.title}</p>
                {t.note && <p className="text-2xl font-medium">{t.note}</p>}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <footer className="flex justify-between text-2xl font-medium text-white/90">
        <span>{credit ?? ''}</span>
        <span>{elapsed ? `소요 시간 ${elapsed}` : ''}</span>
      </footer>
    </div>
  );
}
