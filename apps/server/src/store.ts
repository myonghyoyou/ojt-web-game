import { randomInt } from 'node:crypto';
import type { Room } from '@ojt/game';

export class RoomStore {
  private readonly rooms = new Map<string, Room>();

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  add(room: Room): void {
    this.rooms.set(room.code, room);
  }

  delete(code: string): void {
    this.rooms.delete(code);
  }

  /** Four digits, easy to type on the laptop. */
  newCode(): string {
    for (let i = 0; i < 1000; i++) {
      const code = String(randomInt(0, 10000)).padStart(4, '0');
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('no free room code');
  }

  /** Started rooms live `ttlMs`; rooms nobody started live only `lobbyTtlMs`. */
  expired(now: number, ttlMs: number, lobbyTtlMs: number): Room[] {
    return [...this.rooms.values()].filter((room) => now - room.createdAt > (room.startedAt === null ? lobbyTtlMs : ttlMs));
  }
}
