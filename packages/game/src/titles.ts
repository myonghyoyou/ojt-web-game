import { getQuestion } from './questions';
import { totalVotes } from './round';
import type { Room, Title } from './types';

export const MYSTERY_TITLE = '미스터리 담당';
export const MYSTERY_NOTE = '아직 아무도 이 사람을 파악하지 못했습니다';

/**
 * Greedy: sort (player, round) pairs by vote share, then hand each round's title to one player and
 * each player one title. Ties: more votes, then earlier round, then join order.
 */
export function assignTitles(room: Room): Title[] {
  const players = room.players.filter((p) => p.status === 'active');
  const order = (id: string) => players.findIndex((p) => p.id === id);
  const pairs: { playerId: string; roundIndex: number; votes: number; share: number }[] = [];

  room.rounds.forEach((round, roundIndex) => {
    const total = totalVotes(round);
    if (!round.result || total === 0) return;
    for (const p of players) {
      const votes = round.votes[p.id] ?? 0;
      if (votes > 0) pairs.push({ playerId: p.id, roundIndex, votes, share: votes / total });
    }
  });
  pairs.sort(
    (a, b) => b.share - a.share || b.votes - a.votes || a.roundIndex - b.roundIndex || order(a.playerId) - order(b.playerId),
  );

  const byPlayer = new Map<string, Title>();
  const usedRounds = new Set<number>();
  for (const pair of pairs) {
    if (byPlayer.has(pair.playerId) || usedRounds.has(pair.roundIndex)) continue;
    const question = getQuestion(room.rounds[pair.roundIndex].questionId);
    byPlayer.set(pair.playerId, { playerId: pair.playerId, title: question.title, questionId: question.id });
    usedRounds.add(pair.roundIndex);
  }
  return players.map((p) => byPlayer.get(p.id) ?? { playerId: p.id, title: MYSTERY_TITLE, questionId: null });
}
