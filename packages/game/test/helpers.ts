import { GameError, createRoom, joinRoom, startGame, submitVote, type Rng, type Room } from '../src';

/** Deterministic rng: always picks the first option. */
export const first: Rng = () => 0;

/** Runs fn and returns the GameError code it throws, or 'NO_ERROR'. */
export function code(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    if (e instanceof GameError) return e.code;
    throw e;
  }
  return 'NO_ERROR';
}

/** Player ids are `id-<name>` so tests read naturally. */
export function lobby(names: string[]): Room {
  const room = createRoom('1234', 'op-token', 0);
  for (const name of names) joinRoom(room, name, `id-${name}`, `tk-${name}`);
  return room;
}

export function started(names: string[] = ['A', 'B', 'C', 'D']): Room {
  const room = lobby(names);
  startGame(room, 1000);
  return room;
}

let reasonSeq = 0;

export function vote(room: Room, voter: string, target: string, prediction = 0, reason = ''): void {
  reasonSeq += 1;
  submitVote(room, `id-${voter}`, { targetId: `id-${target}`, prediction, reason }, `reason-${reasonSeq}`, first);
}
