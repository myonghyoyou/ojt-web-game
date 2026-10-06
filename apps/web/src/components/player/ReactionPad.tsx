'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import type { ReactionKind } from '@ojt/game';
import { REACTION_LABELS } from '@/lib/reactions';
import { call } from '@/lib/socket';

export function ReactionPad({ isTop, hasProtested }: { isTop: boolean; hasProtested: boolean }) {
  const [cooling, setCooling] = useState(false);

  function react(kind: ReactionKind) {
    if (cooling) return;
    setCooling(true);
    setTimeout(() => setCooling(false), 500);
    navigator.vibrate?.(15);
    void call('player:react', { kind });
  }

  const small: ReactionKind[] = isTop ? ['lol', 'agree'] : ['lol', 'agree', 'unfair'];

  return (
    <div className="flex min-h-dvh flex-col p-5">
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="font-display text-3xl text-brand-deep">앞 화면을 보세요</p>
        {isTop && <p className="text-muted">{hasProtested ? '억울함이 전달됐어요.' : '이번 문제 1위예요.'}</p>}
      </div>
      <div className="flex flex-col gap-3">
        {isTop && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => react('unfair')}
            className="min-h-28 rounded-3xl bg-brand-deep font-display text-5xl text-white"
          >
            {REACTION_LABELS.unfair}
          </motion.button>
        )}
        <div className={`grid gap-3 ${isTop ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {small.map((kind) => (
            <motion.button
              key={kind}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => react(kind)}
              className="min-h-24 rounded-3xl bg-white font-display text-3xl text-brand-deep shadow-sm"
            >
              {REACTION_LABELS[kind]}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
