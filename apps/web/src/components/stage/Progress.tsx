'use client';

import { motion } from 'motion/react';

/** Corner tag + round dots, shared by the voting and result screens. */
export function StageTopBar({ number, total }: { number: number; total: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="-rotate-2 rounded-xl bg-sun px-5 py-2 font-display text-3xl text-night">누가 가장 그럴까?</span>
      <div className="flex items-center gap-5">
        <div className="flex gap-2" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <motion.span
              key={i}
              className="block h-4 w-4 rounded-full"
              initial={false}
              animate={{ backgroundColor: i < number ? '#ffffff' : 'rgba(255, 255, 255, 0.25)', scale: i === number - 1 ? 1.35 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            />
          ))}
        </div>
        <span className="text-3xl font-bold">
          Q{number} / {total}
        </span>
      </div>
    </div>
  );
}
