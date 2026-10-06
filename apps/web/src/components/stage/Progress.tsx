'use client';

import { motion } from 'motion/react';

export function Progress({ number, total }: { number: number; total: number }) {
  return (
    <div className="flex items-center gap-6">
      <span className="text-3xl font-bold text-brand-mid">Q{number} / {total}</span>
      <div className="flex flex-1 gap-2">
        {Array.from({ length: total }, (_, i) => (
          <motion.div
            key={i}
            className="h-3 flex-1 rounded-full"
            initial={false}
            animate={{ backgroundColor: i < number ? 'rgb(0, 108, 183)' : 'rgba(0, 172, 230, 0.2)' }}
            transition={{ duration: 0.4, delay: i === number - 1 ? 0.2 : 0 }}
          />
        ))}
      </div>
    </div>
  );
}
