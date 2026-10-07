'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import type { StageView } from '@ojt/game';
import { colorStyle } from '@/lib/colors';

export function StageLobby({ view }: { view: StageView }) {
  const [joinUrl, setJoinUrl] = useState('');
  const [host, setHost] = useState('');
  useEffect(() => {
    setJoinUrl(`${window.location.origin}/p/${view.code}`);
    setHost(window.location.host);
  }, [view.code]);
  const players = view.players.filter((p) => p.status === 'active');

  return (
    <div className="grid h-full grid-cols-[auto_1fr] items-center gap-16 p-14">
      <div className="flex -rotate-2 flex-col items-center gap-5 rounded-4xl bg-white p-10 text-night shadow-[0_18px_0_var(--color-stage-deep)]">
        {joinUrl && <QRCodeSVG value={joinUrl} size={380} fgColor="#16161d" />}
        <p className="text-2xl font-bold">카메라 앱으로 찍어 주세요</p>
        <div className="flex w-full flex-col items-center gap-1 border-t-2 border-dashed border-gray-300 pt-4">
          <p className="text-xl text-muted">QR이 안 되면 아래 주소에서 방 번호 입력</p>
          <p className="text-2xl font-bold">{host}</p>
          <p className="font-display text-7xl tracking-[0.25em] text-brand-deep" aria-label={`방 번호 ${view.code}`}>
            {view.code}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-10">
        <h1 className="w-fit -rotate-2 rounded-2xl bg-sun px-8 py-4 font-display text-8xl text-night">누가 가장 그럴까?</h1>
        <div className="space-y-3 text-3xl font-medium">
          <p>질문마다 가장 그럴 것 같은 사람을 한 명 고르고, 내가 몇 표 받을지도 예상해 봐요.</p>
          <p>누가 누구를 골랐는지는 끝까지 아무도 몰라요.</p>
        </div>
        <p className="text-3xl font-bold">{players.length}명 입장</p>
        {players.length === 0 && <p className="text-3xl text-white/85">QR을 찍거나 방 번호를 넣고 입장하면 여기에 이름이 나타나요.</p>}
        <ul className="flex flex-wrap gap-5">
          <AnimatePresence>
            {players.map((p, i) => (
              <motion.li
                key={p.id}
                layout
                initial={{ x: -400, rotate: -200, opacity: 0 }}
                animate={{ x: 0, rotate: 0, opacity: p.connected ? 1 : 0.45, y: [0, -8, 0] }}
                exit={{ scale: 0.3, opacity: 0 }}
                transition={{
                  default: { type: 'spring', stiffness: 160, damping: 14 },
                  y: { repeat: Infinity, duration: 2.6, ease: 'easeInOut', delay: i * 0.3 },
                }}
                className="rounded-full px-9 py-5 text-4xl font-bold shadow-[0_8px_0_rgba(0,0,0,0.22)]"
                style={colorStyle(p.color)}
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
