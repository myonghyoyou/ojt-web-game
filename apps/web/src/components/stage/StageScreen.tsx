'use client';

import type { StageView } from '@ojt/game';
import { Notice } from '@/components/ui/Notice';
import { useHealthPing } from '@/lib/health';
import { messageFor } from '@/lib/messages';
import { call, setHandshakeAuth } from '@/lib/socket';
import { useRoomState } from '@/lib/useRoomState';
import { ReactionLayer } from './ReactionLayer';
import { StageFinal } from './StageFinal';
import { StageLobby } from './StageLobby';
import { StageResult } from './StageResult';
import { StageVoting } from './StageVoting';

const STAGE_STYLE = { backgroundColor: 'var(--color-stage)', color: '#ffffff' };

export function StageScreen({ code }: { code: string }) {
  const { view, closed, error } = useRoomState<StageView>(`stage:${code}`, () => {
    setHandshakeAuth({ code, role: 'stage' });
    return call('stage:watch', { code });
  });
  useHealthPing();

  if (closed) return <Notice title="감사합니다" style={STAGE_STYLE}>이제 교육 시작하겠습니다.</Notice>;
  if (error && !view) return <Notice style={STAGE_STYLE}>{messageFor(error)}</Notice>;
  if (!view) return <Notice style={STAGE_STYLE}>서버에 연결하는 중</Notice>;

  return (
    <main className="relative h-dvh overflow-hidden bg-stage text-white">
      {view.phase === 'lobby' && <StageLobby view={view} />}
      {view.phase === 'voting' && <StageVoting view={view} />}
      {view.phase === 'reveal' && <StageResult view={view} />}
      {view.phase === 'final' && <StageFinal view={view} />}
      <ReactionLayer />
    </main>
  );
}
