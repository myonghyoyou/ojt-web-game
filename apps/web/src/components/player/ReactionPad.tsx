'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import type { ReactionKind } from '@ojt/game';
import { colorStyle } from '@/lib/colors';
import { REACTION_LABELS } from '@/lib/reactions';
import { call } from '@/lib/socket';

export function ReactionPad({ isTop, hasProtested, color }: { isTop: boolean; hasProtested: boolean; color: number }) {
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
    <div className="flex min-h-dvh flex-col p-5" style={colorStyle(color)}>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="font-display text-4xl">앞 화면을 보세요</p>
        {isTop && <p className="text-lg font-bold">{hasProtested ? '억울함이 전달됐어요.' : '이번 문제 1위예요. 앞 화면이 내 색이에요.'}</p>}
      </div>
      <div className="flex flex-col gap-3">
        {isTop && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.92, rotate: -2 }}
            onClick={() => react('unfair')}
            className="caption min-h-28 rounded-3xl bg-night text-6xl"
          >
            {REACTION_LABELS.unfair}
          </motion.button>
        )}
        <div className={`grid gap-3 ${isTop ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {small.map((kind) => (
            <motion.button
              key={kind}
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => react(kind)}
              className="min-h-24 rounded-3xl bg-white font-display text-3xl text-night shadow-[0_6px_0_rgba(0,0,0,0.2)]"
            >
              {REACTION_LABELS[kind]}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
