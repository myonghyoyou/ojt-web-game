'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import type { ReactionKind } from '@ojt/game';
import { REACTION_LABELS } from '@/lib/reactions';
import { getSocket } from '@/lib/socket';

interface Floating { id: number; kind: ReactionKind; x: number }

const MAX_ON_SCREEN = 24;

export function ReactionLayer() {
  const [items, setItems] = useState<Floating[]>([]);

  useEffect(() => {
    const socket = getSocket();
    let seq = 0;
    const onReaction = ({ kind }: { kind: ReactionKind }) => {
      seq += 1;
      const id = seq;
      setItems((list) => [...list.slice(-(MAX_ON_SCREEN - 1)), { id, kind, x: 8 + Math.random() * 84 }]);
      setTimeout(() => setItems((list) => list.filter((item) => item.id !== id)), 2200);
    };
    socket.on('reaction', onReaction);
    return () => {
      socket.off('reaction', onReaction);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2" aria-hidden>
      {items.map((item) => (
        <motion.span
          key={item.id}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -320, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2, ease: 'easeOut' }}
          style={{ left: `${item.x}%` }}
          className="absolute bottom-8 font-display text-5xl text-brand-mid"
        >
          {REACTION_LABELS[item.kind]}
        </motion.span>
      ))}
    </div>
  );
}
