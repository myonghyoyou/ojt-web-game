'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { PlayerView } from '@ojt/game';
import { Notice } from '@/components/ui/Notice';
import { messageFor } from '@/lib/messages';
import { call } from '@/lib/socket';
import { readJson, removeKey, writeJson } from '@/lib/storage';
import { useRoomState } from '@/lib/useRoomState';
import { JoinForm, type PlayerCreds } from './JoinForm';
import { ReactionPad } from './ReactionPad';
import { VoteFlow } from './VoteFlow';

export function PlayerScreen({ code }: { code: string }) {
  const storageKey = `player:${code}`;
  const [creds, setCreds] = useState<PlayerCreds | null | undefined>(undefined);
  useEffect(() => setCreds(readJson<PlayerCreds>(storageKey)), [storageKey]);

  const { view, closed, error } = useRoomState<PlayerView>(
    `${storageKey}:${creds?.playerId ?? 'none'}`,
    creds ? () => call('player:resume', { code, ...creds }) : null,
  );

  useEffect(() => {
    if (error === 'PLAYER_NOT_FOUND' || error === 'UNAUTHORIZED') {
      removeKey(storageKey);
      setCreds(null);
    }
  }, [error, storageKey]);

  if (closed) return <Notice title="게임 끝">함께해 주셔서 감사합니다!</Notice>;
  if (error === 'ROOM_NOT_FOUND') return <Notice>{messageFor(error)}</Notice>;
  if (creds === undefined) return <Notice>참가 정보를 확인하는 중</Notice>;
  if (creds === null) {
    return (
      <JoinForm
        code={code}
        onJoined={(next) => {
          writeJson(storageKey, next);
          setCreds(next);
        }}
      />
    );
  }
  if (!view) return <Notice>서버에 연결하는 중</Notice>;
  return <PlayerStage view={view} />;
}

function PlayerStage({ view }: { view: PlayerView }) {
  const { me, round } = view;
  if (me.status === 'removed') return <Notice>운영자가 참가 목록에서 제외했어요.</Notice>;
  if (me.status === 'pending') return <Notice title="입장 대기">운영자가 확인하면 다음 문제부터 참여해요.</Notice>;
  if (view.phase === 'lobby') return <Notice title={`${me.name} 님`}>내 이름이 앞 화면에 떴어요. 지금 {view.playerCount}명이 모였어요.</Notice>;
  if (view.phase === 'final') return <Notice title="앞 화면을 보세요">오늘 우리가 본 서로의 이미지가 공개됩니다.</Notice>;
  if (view.phase === 'reveal') return <ReactionPad isTop={view.isTop} hasProtested={view.hasProtested} />;
  if (!round || !me.eligible) return <Notice>다음 문제부터 참여해요.</Notice>;

  return (
    <AnimatePresence mode="wait">
      {round.hasVoted ? (
        <motion.div key="voted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Notice title="투표 완료">
            다른 사람을 기다리는 중 · {round.votedCount} / {round.eligibleCount}
          </Notice>
        </motion.div>
      ) : (
        <VoteFlow key={`${round.number}-${round.question}`} round={round} />
      )}
    </AnimatePresence>
  );
}
