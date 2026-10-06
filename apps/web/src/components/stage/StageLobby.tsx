'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import type { StageView } from '@ojt/game';

export function StageLobby({ view }: { view: StageView }) {
  const [joinUrl, setJoinUrl] = useState('');
  useEffect(() => setJoinUrl(`${window.location.origin}/p/${view.code}`), [view.code]);
  const players = view.players.filter((p) => p.status === 'active');

  return (
    <div className="grid h-full grid-cols-[auto_1fr] items-center gap-16">
      <div className="flex flex-col items-center gap-5 rounded-3xl bg-white p-10 shadow-sm">
        {joinUrl && <QRCodeSVG value={joinUrl} size={380} fgColor="#006CB7" />}
        <p className="text-2xl text-muted">카메라 앱으로 찍어 주세요</p>
        <p className="text-xl font-bold text-brand-deep">{joinUrl.replace(/^https?:\/\//, '')}</p>
      </div>
      <div className="flex flex-col gap-10">
        <h1 className="font-display text-7xl text-brand-deep">누가 가장 그럴까?</h1>
        <div className="space-y-3 text-3xl">
          <p>질문마다 가장 그럴 것 같은 사람을 한 명 고르고, 내가 몇 표 받을지도 예상합니다.</p>
          <p>누가 누구를 골랐는지는 끝까지 아무도 모릅니다.</p>
        </div>
        <p className="text-2xl text-muted">{players.length}명 입장</p>
        {players.length === 0 && <p className="text-3xl text-muted">QR을 찍고 이름을 넣으면 여기에 나타나요.</p>}
        <ul className="flex flex-wrap gap-4">
          <AnimatePresence>
            {players.map((p, i) => (
              <motion.li
                key={p.id}
                layout
                initial={{ scale: 0.4, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: p.connected ? 1 : 0.4, y: [0, -6, 0] }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{
                  default: { type: 'spring', stiffness: 400, damping: 18 },
                  y: { repeat: Infinity, duration: 3, ease: 'easeInOut', delay: i * 0.4 },
                }}
                className="rounded-2xl bg-white px-8 py-5 text-4xl font-bold shadow-sm"
              >
                {p.name}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}
