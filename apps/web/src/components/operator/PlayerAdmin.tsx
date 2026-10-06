'use client';

import type { PublicPlayer } from '@ojt/game';

interface Props {
  players: PublicPlayer[];
  disabled: boolean;
  onRename: (playerId: string, name: string) => void;
  onRemove: (playerId: string, name: string) => void;
}

export function PlayerAdmin({ players, disabled, onRename, onRemove }: Props) {
  return (
    <section className="rounded-2xl bg-white p-4">
      <h2 className="mb-2 font-bold">참가자 {players.length}명</h2>
      {players.length === 0 && (
        <p className="text-muted">아직 아무도 입장하지 않았어요. 무대 화면의 QR을 찍으면 여기에 나타나요.</p>
      )}
      <ul className="divide-y divide-gray-100">
        {players.map((p) => (
          <li key={p.id} className="flex items-center gap-2 py-1">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.connected ? 'bg-brand-sky' : 'bg-gray-300'}`}
              aria-label={p.connected ? '연결됨' : '연결 끊김'}
            />
            <span className="flex-1 text-lg">{p.name}</span>
            <button
              type="button"
              className="min-h-12 px-3 text-brand-deep disabled:opacity-40"
              disabled={disabled}
              onClick={() => {
                const next = window.prompt('새 이름 (1~6자)', p.name);
                if (next && next.trim() !== p.name) onRename(p.id, next);
              }}
            >
              이름 수정
            </button>
            <button
              type="button"
              className="min-h-12 px-3 text-red-600 disabled:opacity-40"
              disabled={disabled}
              onClick={() => onRemove(p.id, p.name)}
            >
              제외
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
