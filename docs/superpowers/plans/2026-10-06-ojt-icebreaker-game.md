# OJT 아이스브레이킹 웹게임 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 신입사원 4명(최대 8명)이 폰으로 "누가 가장 ○○할 것 같은가"에 투표하고, 프로젝터 무대 화면에서 결과를 함께 보는 약 10분짜리 실시간 웹게임을 만든다.

**Architecture:** npm workspaces 모노레포. 게임 규칙은 순수 TypeScript 패키지(`@ojt/game`)에 모아 단위 테스트로 고정한다. 실시간 서버(`@ojt/server`, Node + Socket.IO)는 방 상태를 메모리에 들고 Render에 배포한다. 화면(`@ojt/web`, Next.js)은 Vercel에 배포하고 Socket.IO로 실시간 서버에 직접 연결한다.

**Tech Stack:** Node 22, TypeScript, Vitest, Socket.IO 4, Next.js (App Router), Tailwind CSS 4, motion (Framer Motion), qrcode.react, tsx, tsup

**Spec:** PRD: https://claude.ai/code/artifact/8b97616e-4432-4ce6-8507-e3779d38dc00 (Claude Docs 문서. 구현 전에 전체를 읽는다.)

## Global Constraints

- 인원: 최소 3명으로 시작, 기준 4명, 최대 8명. 운영자는 플레이어가 아니다.
- 라운드: 7라운드 고정 순서 + 예비 3문제. 한 게임에 실수형 질문은 최대 1개.
- 투표: 셀프 투표 불가, 변경 불가, 제한시간 없음. 이름 1~6자, 이유 0~20자(선택), 예상 득표 0~(투표자 수-1).
- 익명성: 투표자와 대상의 연결은 어디에도 저장하지 않는다. 이유에도 작성자를 남기지 않는다. 서버 로그에 이름, 투표, 이유를 찍지 않는다.
- 결과: 득표수만 공개. 결선 없음, 공동 1위. 결과 공개 자동 연출은 10초 이내. 이유는 운영자가 "이유 보기"를 눌러야만 1위에게 달린 것 최대 2개 공개.
- 반응 버튼: 결과 단계에서만, 1인당 초당 최대 2회. 종류는 `ㅋㅋㅋ / 인정 / 억울`.
- 데이터: DB 없음. 방은 운영자가 종료하거나 생성 2시간 뒤 삭제.
- 디자인: 밝은 배경. 색 `rgb(0,108,183)` 딥 블루(1위, 주요 버튼), `rgb(0,123,195)` 미들 블루(눌림, 선택 테두리), `rgb(0,172,230)` 스카이 블루(보조 막대, 채움; 이 위에 흰 글자 금지). 폰트는 큰 글자에 카페24 써라운드, 나머지와 사용자 입력은 지마켓 산스. 사운드 없음. 이모지 없음. 폭죽·흔들림·파티클 없음. `prefers-reduced-motion` 존중.
- 화면 문구는 모두 한국어. 한자·일본어·중국어 문자 금지.
- 디자인 방향(Design Read): "OJT 첫날 신입사원 4명과 운영자 1명이 함께 보는 예능 투표 코너형 파티 게임, PRD 8절의 밝은 브랜드 블루 언어, 다이얼 ENERGY 2 / RHYTHM 1 / MOTION 2". ENERGY 2는 예능 감성은 내되 회사 교육장에 맞게. RHYTHM 1은 화면마다 한 가지 일만 하므로 구성이 일정. MOTION 2는 사람의 행동에 반응하는 움직임만 (PRD 7절).
- 화면마다 초점은 하나: 입장 대기는 QR, 투표 중은 질문, 결과는 1위 막대, 최종은 칭호 카드. 강조색(딥 블루)은 그 초점에만 쓴다.
- 안티 슬롭 문구 규칙: em dash(—) 금지(쌍점, 쉼표, 가운뎃점으로 대체). "..." 대신 무엇을 기다리는지 쓴다("서버에 연결하는 중"). "확인", "다음" 같은 범용 버튼은 단계 이동에만 쓰고, 행동 버튼은 결과를 말한다("결과 공개", "이 문제 건너뛰기"). 꾸밈용 화살표, 배지, 이모지 금지. 숫자와 칭호는 실제 투표에서 나온 것만 보여준다.
- 접근성: 모든 글자 대비 WCAG AA 이상. 작은 글자에는 딥 블루만 쓴다(미들 블루는 밝은 회색 배경 위에서 4.2:1이라 큰 글자 전용). 모든 조작 요소에 보이는 포커스 표시(전역 `:focus-visible` 외곽선). 터치 영역 최소 48px.
- 팀 크레딧 문구: `Made by 정보시스템팀 류명효 대리` (`NEXT_PUBLIC_TEAM_CREDIT`).
- 실시간 연결은 Socket.IO 기본 전송 방식(롱폴링으로 시작해 WebSocket으로 전환)을 쓴다. 사내망에서 WebSocket이 막혀도 동작해야 한다.
- 커밋 메시지는 마지막 줄을 `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`로 끝낸다.

## Review Focus

1. 투표 도중 폰 화면이 꺼졌다 켜짐 → 같은 참가자로 복귀하고, 이미 투표했으면 대기 화면이 나와야 한다. (Task 5 `hasVoted` 테스트, Task 6 재접속 테스트)
2. 마지막 두 사람이 거의 동시에 투표 → 결과 공개는 한 번, 득표 합계는 정확해야 한다. (Task 3 `maybeAutoReveal` 중복 테스트, Task 6 동시 투표 테스트)
3. 운영자가 폰을 새로고침 → 같은 폰에서 권한이 복구되고, 다른 토큰은 거부되어야 한다. (Task 6 운영자 복구 테스트)
4. 제외된 참가자가 열어 둔 화면에서 투표 → 거부되어야 한다. (Task 3 `NOT_ELIGIBLE` 테스트)
5. 결과 화면에서 반응 버튼 연타 → 무대 화면이 넘치지 않아야 하고, 투표 중에는 반응이 거부되어야 한다. (Task 6 반응 테스트)

---

## File Structure

```
package.json                     workspaces, 공통 스크립트
tsconfig.base.json               공통 TS 설정
.gitignore, .nvmrc
render.yaml                      Render 실시간 서버 배포 설정
README.md                        로컬 실행, 배포, 당일 운영 절차

packages/game/                   @ojt/game: 게임 규칙 (순수 함수, I/O 없음)
  src/types.ts                   상수, 타입, GameError
  src/questions.ts               질문 10개와 칭호
  src/comments.ts                결과 멘트, 예상 득표 멘트, 중복 없는 선택
  src/round.ts                   라운드: 투표, 결과 판정, 공개, 이유, 억울, 다음, 건너뛰기
  src/room.ts                    방: 생성, 입장, 이름 수정, 제외, 허용, 시작, 종료
  src/titles.ts                  최종 칭호 배정
  src/views.ts                   역할별 화면 상태 (무대 / 운영자 / 참가자)
  src/index.ts                   공개 API
  test/*.test.ts

apps/server/                     @ojt/server: Socket.IO 실시간 서버
  src/store.ts                   메모리 방 저장소, 방 코드 발급
  src/app.ts                     이벤트 처리, 브로드캐스트, 반응 제한, 만료 정리
  src/index.ts                   진입점 (PORT, WEB_ORIGIN)
  test/app.test.ts

apps/web/                        @ojt/web: Next.js 화면
  src/app/layout.tsx, globals.css, page.tsx (운영자 방 만들기 / 무대 화면 열기)
  src/app/op/[code]/page.tsx     운영자 화면
  src/app/p/[code]/page.tsx      참가자 화면 (QR 대상)
  src/app/stage/[code]/page.tsx  무대 화면
  src/lib/                       socket, storage, messages, format, useRoomState, health, reactions
  src/components/ui/             Button, Notice, MotionProvider
  src/components/operator/       OperatorScreen, PlayerAdmin
  src/components/player/         PlayerScreen, JoinForm, VoteFlow, ReactionPad
  src/components/stage/          StageScreen, StageLobby, StageVoting, StageResult, StageFinal, ReactionLayer, Progress
```

---

### Task 1: 모노레포 골격과 게임 기본 데이터

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `.gitignore`, `.nvmrc`
- Create: `packages/game/package.json`, `packages/game/tsconfig.json`
- Create: `packages/game/src/types.ts`, `packages/game/src/questions.ts`, `packages/game/src/comments.ts`, `packages/game/src/index.ts`
- Test: `packages/game/test/basics.test.ts`

**Interfaces:**
- Produces: 상수 `MIN_PLAYERS=3, MAX_PLAYERS=8, TOTAL_ROUNDS=7, NAME_MAX=6, REASON_MAX=20, ROOM_TTL_MS, REACTION_KINDS`; 타입 `Room, Player, Round, Reason, RoundResult, PredictionHighlight, Title, Phase, PlayerStatus, ResultType, PredictionKind, ReactionKind, Rng, ErrorCode`; 클래스 `GameError(code)`; `QUESTIONS, MAIN_IDS, SPARE_IDS, getQuestion(id): Question`; `RESULT_COMMENTS, MANY_WAY_TIE_COMMENTS, PREDICTION_COMMENTS, resultPool(type, topCount), pickComment(pool, used, rng): string`

- [ ] **Step 1: 저장소 초기화와 루트 파일 작성**

```bash
cd /c/projects/ojt-web-game
git init -b main
```

`package.json`:

```json
{
  "name": "ojt-web-game",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "test": "npm run test --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "dev:server": "npm run dev -w @ojt/server",
    "dev:web": "npm run dev -w @ojt/web"
  },
  "engines": { "node": ">=22" }
}
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2023"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "noEmit": true
  }
}
```

`.gitignore`:

```
node_modules
dist
.next
.env*
!.env.example
*.log
```

`.nvmrc`:

```
22
```

- [ ] **Step 2: game 패키지 설정과 개발 도구 설치**

`packages/game/package.json`:

```json
{
  "name": "@ojt/game",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit -p ."
  }
}
```

`packages/game/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src", "test"]
}
```

```bash
npm install -D typescript vitest
```

- [ ] **Step 3: 실패하는 테스트 작성**

`packages/game/test/basics.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  MAIN_IDS, MANY_WAY_TIE_COMMENTS, QUESTIONS, RESULT_COMMENTS, SPARE_IDS,
  getQuestion, pickComment, resultPool,
} from '../src';

describe('questions', () => {
  it('has 7 curated main questions and 3 spares, starting light', () => {
    expect(MAIN_IDS).toHaveLength(7);
    expect(SPARE_IDS).toHaveLength(3);
    expect(MAIN_IDS[0]).toBe('alien');
  });

  it('has exactly one mistake-type question in the main set', () => {
    expect(MAIN_IDS.filter((id) => getQuestion(id).mistake)).toEqual(['karaoke']);
  });

  it('gives every question a unique id, a title and a question mark', () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of QUESTIONS) {
      expect(q.title.length).toBeGreaterThan(0);
      expect(q.text.endsWith('?')).toBe(true);
    }
  });

  it('throws on an unknown id', () => {
    expect(() => getQuestion('nope')).toThrow();
  });
});

describe('comments', () => {
  it('avoids used comments until the pool runs out', () => {
    const used: string[] = [];
    const pool = ['a', 'b'];
    expect(pickComment(pool, used, () => 0)).toBe('a');
    expect(pickComment(pool, used, () => 0)).toBe('b');
    expect(pickComment(pool, used, () => 0)).toBe('a');
  });

  it('never indexes past the pool even if rng returns 1', () => {
    expect(pickComment(['a', 'b'], [], () => 1)).toBe('b');
  });

  it('uses the many-way tie pool for 3+ tied leaders', () => {
    expect(resultPool('tie', 3)).toBe(MANY_WAY_TIE_COMMENTS);
    expect(resultPool('tie', 2)).toBe(RESULT_COMMENTS.tie);
  });
});
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `npm test -w @ojt/game`
Expected: FAIL: `Cannot find module '../src'` 또는 export 없음.

- [ ] **Step 5: 구현**

`packages/game/src/types.ts`:

```ts
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;
export const TOTAL_ROUNDS = 7;
export const NAME_MAX = 6;
export const REASON_MAX = 20;
export const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
export const REACTION_KINDS = ['lol', 'agree', 'unfair'] as const;

export type ReactionKind = (typeof REACTION_KINDS)[number];
export type Phase = 'lobby' | 'voting' | 'reveal' | 'final';
export type PlayerStatus = 'active' | 'pending' | 'removed';
export type ResultType = 'unanimous' | 'tie' | 'normal' | 'scattered';
export type PredictionKind = 'under' | 'over' | 'exact';
/** Returns a number in [0, 1). Injected so tests are deterministic. */
export type Rng = () => number;

export interface Player {
  id: string;
  name: string;
  token: string;
  status: PlayerStatus;
  connected: boolean;
  /** 0-based round index from which this player votes and can be voted for. -1 while pending. */
  joinedRound: number;
}

/** A reason never records who wrote it. */
export interface Reason {
  id: string;
  targetId: string;
  text: string;
  hidden: boolean;
}

export interface PredictionHighlight {
  playerId: string;
  predicted: number;
  actual: number;
  kind: PredictionKind;
  comment: string;
}

export interface RoundResult {
  topIds: string[];
  type: ResultType;
  comment: string;
  prediction: PredictionHighlight | null;
}

/** Who voted (votedIds) and who received votes (votes) are stored separately on purpose. */
export interface Round {
  questionId: string;
  eligibleIds: string[];
  votes: Record<string, number>;
  votedIds: string[];
  predictions: Record<string, number>;
  reasons: Reason[];
  result: RoundResult | null;
  shownReasonIds: string[] | null;
  protestedIds: string[];
}

export interface Title {
  playerId: string;
  title: string;
  questionId: string | null;
}

export interface Room {
  code: string;
  operatorToken: string;
  phase: Phase;
  players: Player[];
  rounds: Round[];
  mainQueue: string[];
  spareQueue: string[];
  usedComments: string[];
  titles: Title[] | null;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
}

export type ErrorCode =
  | 'NAME_INVALID' | 'NAME_TAKEN' | 'ROOM_FULL' | 'ROOM_NOT_FOUND' | 'UNAUTHORIZED'
  | 'WRONG_PHASE' | 'NOT_ENOUGH_PLAYERS' | 'PLAYER_NOT_FOUND' | 'NOT_PENDING'
  | 'NOT_ELIGIBLE' | 'ALREADY_VOTED' | 'SELF_VOTE' | 'INVALID_TARGET' | 'INVALID_PREDICTION'
  | 'REASON_TOO_LONG' | 'REASON_NOT_FOUND' | 'NO_VOTES' | 'NO_SPARE' | 'LAST_ROUND'
  | 'NOT_TOP' | 'ALREADY_PROTESTED' | 'INVALID_REACTION' | 'RATE_LIMITED';

export class GameError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode) {
    super(code);
    this.name = 'GameError';
    this.code = code;
  }
}
```

`packages/game/src/questions.ts`:

```ts
export type QuestionStage = 'light' | 'imagine' | 'finale';

export interface Question {
  id: string;
  text: string;
  title: string;
  stage: QuestionStage;
  mistake: boolean;
  spare: boolean;
}

/** Curated order. Edit this file for the next OJT; PRD section 6 has the content rules. */
export const QUESTIONS: Question[] = [
  { id: 'alien', text: '외계인이 나타나면 도망가기보다 사진부터 찍을 것 같은 사람은?', title: '외계인과 셀카 찍을 사람', stage: 'light', mistake: false, spare: false },
  { id: 'island', text: '무인도에 떨어져도 일주일 뒤에는 적응해서 잘 살고 있을 것 같은 사람은?', title: '무인도 정착 담당', stage: 'light', mistake: false, spare: false },
  { id: 'zombie', text: '좀비 사태가 터지면 이미 비상식량 3개월치를 준비해뒀을 것 같은 사람은?', title: '좀비 사태 생존 담당', stage: 'imagine', mistake: false, spare: false },
  { id: 'joseon', text: '타임머신을 타고 조선시대에 떨어져도 어떻게든 취직부터 할 것 같은 사람은?', title: '조선시대 취업 성공자', stage: 'imagine', mistake: false, spare: false },
  { id: 'ai', text: 'AI가 세상을 지배하면 가장 먼저 AI와 협상하고 있을 것 같은 사람은?', title: 'AI 협상 대표', stage: 'imagine', mistake: false, spare: false },
  { id: 'lottery', text: '복권 20억에 당첨되고도 아무 말 없이 한 달은 출근할 것 같은 사람은?', title: '20억 비밀 유지 담당', stage: 'finale', mistake: false, spare: false },
  { id: 'karaoke', text: '회사에 아무도 없다고 생각하고 혼자 노래 부르다가 걸릴 것 같은 사람은?', title: '사무실 단독 콘서트 주인공', stage: 'finale', mistake: true, spare: false },
  { id: 'festival', text: '해외여행 갔다가 현지 축제 퍼레이드에 얼떨결에 합류하게 될 것 같은 사람은?', title: '현지 축제 즉석 참가자', stage: 'imagine', mistake: false, spare: true },
  { id: 'escape', text: '방탈출에서 별 의미 없는 소품을 끝까지 중요한 단서라고 주장할 것 같은 사람은?', title: '방탈출 단서 수호자', stage: 'imagine', mistake: false, spare: true },
  { id: 'passport', text: '여행 당일 공항에서 여권을 안 가져온 것을 발견할 것 같은 사람은?', title: '여권은 집에 두고 온 사람', stage: 'light', mistake: true, spare: true },
];

export const MAIN_IDS = QUESTIONS.filter((q) => !q.spare).map((q) => q.id);
export const SPARE_IDS = QUESTIONS.filter((q) => q.spare).map((q) => q.id);

export function getQuestion(id: string): Question {
  const question = QUESTIONS.find((q) => q.id === id);
  if (!question) throw new Error(`unknown question: ${id}`);
  return question;
}
```

`packages/game/src/comments.ts`:

```ts
import type { PredictionKind, ResultType, Rng } from './types';

export const RESULT_COMMENTS: Record<ResultType, readonly string[]> = {
  unanimous: ['본인 제외 전원 일치. 이견은 없었습니다.', '만장일치로 가결되었습니다.', '이건 사실상 합의입니다.'],
  tie: ['의견이 정확히 반으로 갈렸습니다.', '둘 다 그럴 것 같다는 뜻입니다.'],
  normal: ['근소한 차이로 결정되었습니다.', '이견은 있었지만 1위는 1위입니다.'],
  scattered: ['서로를 아직 잘 모르는 것으로 판명되었습니다.', '모두가 조금씩 그럴 것 같습니다.'],
};

export const MANY_WAY_TIE_COMMENTS: readonly string[] = ['팽팽합니다. 우열을 가리지 못했습니다.', '공동 1위가 여럿 나왔습니다.'];

export const PREDICTION_COMMENTS: Record<PredictionKind, readonly string[]> = {
  under: ['본인만 몰랐습니다.', '자기 인식과 여론이 다릅니다.'],
  over: ['기대는 컸습니다.', '자신감은 확인되었습니다.'],
  exact: ['자기 객관화 완료.', '본인도 인정한 결과입니다.'],
};

export function resultPool(type: ResultType, topCount: number): readonly string[] {
  return type === 'tie' && topCount > 2 ? MANY_WAY_TIE_COMMENTS : RESULT_COMMENTS[type];
}

/** Picks a comment not yet used in this game; falls back to the full pool once all are used. Mutates `used`. */
export function pickComment(pool: readonly string[], used: string[], rng: Rng): string {
  const fresh = pool.filter((c) => !used.includes(c));
  const from = fresh.length > 0 ? fresh : pool;
  const index = Math.min(from.length - 1, Math.floor(rng() * from.length));
  const comment = from[index] as string;
  used.push(comment);
  return comment;
}
```

`packages/game/src/index.ts`:

```ts
export * from './types';
export * from './questions';
export * from './comments';
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm test -w @ojt/game && npm run typecheck -w @ojt/game`
Expected: PASS (7 tests), 타입 오류 없음.

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "chore: scaffold monorepo and game basics" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 방 생명주기 (입장, 이름 수정, 제외, 허용, 시작)

**Files:**
- Create: `packages/game/src/round.ts` (라운드 생성 부분만)
- Create: `packages/game/src/room.ts`
- Modify: `packages/game/src/index.ts`
- Test: `packages/game/test/helpers.ts`, `packages/game/test/room.test.ts`

**Interfaces:**
- Consumes: Task 1의 타입, `MAIN_IDS`, `SPARE_IDS`
- Produces:
  - `round.ts`: `eligibleIdsFor(room, roundIndex): string[]`, `newRound(room, questionId, roundIndex): Round`, `startRound(room, questionId): void`, `currentRound(room): Round`
  - `room.ts`: `createRoom(code, operatorToken, now): Room`, `normalizeName(raw): string`, `findPlayer(room, id): Player`, `joinRoom(room, rawName, id, token): Player`, `renamePlayer(room, id, rawName): void`, `removePlayer(room, id): void`, `admitPlayer(room, id): void`, `startGame(room, now): void`
  - test helpers: `first: Rng`, `code(fn): string`, `lobby(names): Room`, `started(names?): Room`

- [ ] **Step 1: 테스트 도우미와 실패하는 테스트 작성**

`packages/game/test/helpers.ts`:

```ts
import { GameError, createRoom, joinRoom, startGame, type Rng, type Room } from '../src';

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
```

`packages/game/test/room.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS, admitPlayer, createRoom, joinRoom, removePlayer, renamePlayer, startGame } from '../src';
import { code, lobby, started } from './helpers';

describe('joinRoom', () => {
  it('adds an active player in the lobby with a trimmed name', () => {
    const room = createRoom('1234', 'op', 0);
    const player = joinRoom(room, '  민수 ', 'id-1', 'tk-1');
    expect(player).toMatchObject({ name: '민수', status: 'active', joinedRound: 0, connected: true });
    expect(room.players).toHaveLength(1);
  });

  it('accepts 1 to 6 characters only', () => {
    const room = createRoom('1234', 'op', 0);
    expect(code(() => joinRoom(room, '   ', 'a', 'a'))).toBe('NAME_INVALID');
    expect(code(() => joinRoom(room, '일곱글자이름임', 'b', 'b'))).toBe('NAME_INVALID');
    expect(code(() => joinRoom(room, '여섯글자이름', 'c', 'c'))).toBe('NO_ERROR');
  });

  it('rejects duplicate names but allows reusing a removed name', () => {
    const room = lobby(['A', 'B']);
    expect(code(() => joinRoom(room, 'A', 'x', 'x'))).toBe('NAME_TAKEN');
    removePlayer(room, 'id-A');
    expect(code(() => joinRoom(room, 'A', 'y', 'y'))).toBe('NO_ERROR');
  });

  it('caps the room at 8 present players', () => {
    const room = lobby(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(MAX_PLAYERS).toBe(8);
    expect(code(() => joinRoom(room, '9', 'id-9', 'tk-9'))).toBe('ROOM_FULL');
  });

  it('makes late joiners pending and keeps them out of the current round', () => {
    const room = started();
    const late = joinRoom(room, 'E', 'id-E', 'tk-E');
    expect(late).toMatchObject({ status: 'pending', joinedRound: -1 });
    expect(room.rounds[0].eligibleIds).not.toContain('id-E');
  });

  it('refuses joins after the game is over', () => {
    const room = lobby(['A', 'B', 'C']);
    room.phase = 'final';
    expect(code(() => joinRoom(room, 'Z', 'id-Z', 'tk-Z'))).toBe('WRONG_PHASE');
  });
});

describe('startGame', () => {
  it('needs at least 3 active players', () => {
    expect(code(() => startGame(lobby(['A', 'B']), 5))).toBe('NOT_ENOUGH_PLAYERS');
  });

  it('opens round 1 with the first curated question', () => {
    const room = lobby(['A', 'B', 'C', 'D']);
    startGame(room, 5);
    expect(room.phase).toBe('voting');
    expect(room.startedAt).toBe(5);
    expect(room.rounds).toHaveLength(1);
    expect(room.rounds[0].questionId).toBe('alien');
    expect(room.rounds[0].eligibleIds).toEqual(['id-A', 'id-B', 'id-C', 'id-D']);
    expect(room.mainQueue).toHaveLength(6);
  });

  it('cannot start twice', () => {
    expect(code(() => startGame(started(), 6))).toBe('WRONG_PHASE');
  });
});

describe('admitPlayer', () => {
  it('lets a pending player join from the next round', () => {
    const room = started();
    joinRoom(room, 'E', 'id-E', 'tk-E');
    admitPlayer(room, 'id-E');
    expect(room.players.find((p) => p.id === 'id-E')).toMatchObject({ status: 'active', joinedRound: 1 });
    expect(room.rounds[0].eligibleIds).not.toContain('id-E');
  });

  it('only admits pending players', () => {
    expect(code(() => admitPlayer(started(), 'id-A'))).toBe('NOT_PENDING');
  });
});

describe('renamePlayer', () => {
  it('validates like joining', () => {
    const room = lobby(['A', 'B']);
    renamePlayer(room, 'id-A', '에이');
    expect(room.players[0].name).toBe('에이');
    renamePlayer(room, 'id-A', '에이');
    expect(code(() => renamePlayer(room, 'id-A', 'B'))).toBe('NAME_TAKEN');
    expect(code(() => renamePlayer(room, 'nope', 'Z'))).toBe('PLAYER_NOT_FOUND');
  });
});

describe('removePlayer', () => {
  it('drops the player from the current round immediately', () => {
    const room = started();
    removePlayer(room, 'id-D');
    expect(room.rounds[0].eligibleIds).toEqual(['id-A', 'id-B', 'id-C']);
    expect(room.players.find((p) => p.id === 'id-D')?.status).toBe('removed');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -w @ojt/game -- room`
Expected: FAIL: `createRoom` 등이 export되지 않음.

- [ ] **Step 3: 구현**

`packages/game/src/round.ts`:

```ts
import { GameError, type Room, type Round } from './types';

export function eligibleIdsFor(room: Room, roundIndex: number): string[] {
  return room.players
    .filter((p) => p.status === 'active' && p.joinedRound >= 0 && p.joinedRound <= roundIndex)
    .map((p) => p.id);
}

export function newRound(room: Room, questionId: string, roundIndex: number): Round {
  return {
    questionId,
    eligibleIds: eligibleIdsFor(room, roundIndex),
    votes: {},
    votedIds: [],
    predictions: {},
    reasons: [],
    result: null,
    shownReasonIds: null,
    protestedIds: [],
  };
}

export function startRound(room: Room, questionId: string): void {
  room.rounds.push(newRound(room, questionId, room.rounds.length));
  room.phase = 'voting';
}

export function currentRound(room: Room): Round {
  const round = room.rounds.at(-1);
  if (!round || (room.phase !== 'voting' && room.phase !== 'reveal')) throw new GameError('WRONG_PHASE');
  return round;
}
```

`packages/game/src/room.ts`:

```ts
import { MAIN_IDS, SPARE_IDS } from './questions';
import { startRound } from './round';
import { GameError, MAX_PLAYERS, MIN_PLAYERS, NAME_MAX, type Player, type Room } from './types';

export function createRoom(code: string, operatorToken: string, now: number): Room {
  return {
    code,
    operatorToken,
    phase: 'lobby',
    players: [],
    rounds: [],
    mainQueue: [...MAIN_IDS],
    spareQueue: [...SPARE_IDS],
    usedComments: [],
    titles: null,
    createdAt: now,
    startedAt: null,
    endedAt: null,
  };
}

export function normalizeName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, ' ');
  const length = Array.from(name).length;
  if (length < 1 || length > NAME_MAX) throw new GameError('NAME_INVALID');
  return name;
}

export function findPlayer(room: Room, id: string): Player {
  const player = room.players.find((p) => p.id === id);
  if (!player) throw new GameError('PLAYER_NOT_FOUND');
  return player;
}

function presentPlayers(room: Room): Player[] {
  return room.players.filter((p) => p.status !== 'removed');
}

function assertNameFree(room: Room, name: string, exceptId?: string): void {
  if (presentPlayers(room).some((p) => p.name === name && p.id !== exceptId)) throw new GameError('NAME_TAKEN');
}

export function joinRoom(room: Room, rawName: string, id: string, token: string): Player {
  if (room.phase === 'final') throw new GameError('WRONG_PHASE');
  const name = normalizeName(rawName);
  assertNameFree(room, name);
  if (presentPlayers(room).length >= MAX_PLAYERS) throw new GameError('ROOM_FULL');
  const inLobby = room.phase === 'lobby';
  const player: Player = {
    id,
    name,
    token,
    status: inLobby ? 'active' : 'pending',
    connected: true,
    joinedRound: inLobby ? 0 : -1,
  };
  room.players.push(player);
  return player;
}

export function renamePlayer(room: Room, id: string, rawName: string): void {
  const player = findPlayer(room, id);
  const name = normalizeName(rawName);
  assertNameFree(room, name, id);
  player.name = name;
}

export function removePlayer(room: Room, id: string): void {
  const player = findPlayer(room, id);
  player.status = 'removed';
  const round = room.rounds.at(-1);
  if (round && room.phase === 'voting') round.eligibleIds = round.eligibleIds.filter((x) => x !== id);
}

export function admitPlayer(room: Room, id: string): void {
  const player = findPlayer(room, id);
  if (player.status !== 'pending') throw new GameError('NOT_PENDING');
  if (room.phase === 'final') throw new GameError('WRONG_PHASE');
  player.status = 'active';
  player.joinedRound = room.rounds.length;
}

export function startGame(room: Room, now: number): void {
  if (room.phase !== 'lobby') throw new GameError('WRONG_PHASE');
  const active = room.players.filter((p) => p.status === 'active');
  if (active.length < MIN_PLAYERS) throw new GameError('NOT_ENOUGH_PLAYERS');
  const firstQuestion = room.mainQueue.shift();
  if (!firstQuestion) throw new GameError('LAST_ROUND');
  room.startedAt = now;
  startRound(room, firstQuestion);
}
```

`packages/game/src/index.ts`에 추가:

```ts
export * from './round';
export * from './room';
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -w @ojt/game && npm run typecheck -w @ojt/game`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(game): room lifecycle" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 3: 투표와 결과 판정

**Files:**
- Modify: `packages/game/src/round.ts`
- Modify: `packages/game/test/helpers.ts`
- Test: `packages/game/test/vote.test.ts`

**Interfaces:**
- Consumes: Task 2의 `currentRound`, `room.ts`
- Produces (`round.ts`):
  - `interface VoteInput { targetId: string; reason?: string; prediction: number }`
  - `submitVote(room, voterId, input: VoteInput, reasonId: string, rng: Rng): void`
  - `totalVotes(round): number`, `allVoted(round): boolean`
  - `classify(round): { topIds: string[]; type: ResultType }`
  - `reveal(room, rng): void`, `maybeAutoReveal(room, rng): boolean`
  - test helper `vote(room, voter, target, prediction = 0, reason = ''): void`

- [ ] **Step 1: 도우미 추가와 실패하는 테스트 작성**

`packages/game/test/helpers.ts`의 import 줄을 바꾸고 맨 아래에 `vote`를 추가한다.

```ts
import { GameError, createRoom, joinRoom, startGame, submitVote, type Rng, type Room } from '../src';
```

```ts
let reasonSeq = 0;

export function vote(room: Room, voter: string, target: string, prediction = 0, reason = ''): void {
  reasonSeq += 1;
  submitVote(room, `id-${voter}`, { targetId: `id-${target}`, prediction, reason }, `reason-${reasonSeq}`, first);
}
```

`packages/game/test/vote.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { allVoted, classify, joinRoom, maybeAutoReveal, removePlayer, reveal, totalVotes } from '../src';
import { code, first, started, vote } from './helpers';

describe('submitVote', () => {
  it('counts the vote without linking voter to target', () => {
    const room = started();
    vote(room, 'A', 'B', 1, ' 평소에도 그럼 ');
    const round = room.rounds[0];
    expect(round.votes).toEqual({ 'id-B': 1 });
    expect(round.votedIds).toEqual(['id-A']);
    expect(round.predictions).toEqual({ 'id-A': 1 });
    expect(round.reasons).toEqual([{ id: expect.any(String), targetId: 'id-B', text: '평소에도 그럼', hidden: false }]);
    expect(Object.keys(round).sort()).toEqual([
      'eligibleIds', 'predictions', 'protestedIds', 'questionId', 'reasons', 'result', 'shownReasonIds', 'votedIds', 'votes',
    ]);
  });

  it('does not store blank reasons', () => {
    const room = started();
    vote(room, 'A', 'B', 0, '   ');
    expect(room.rounds[0].reasons).toEqual([]);
  });

  it('inserts reasons at a random position so their order does not reveal the author', () => {
    const room = started();
    vote(room, 'A', 'B', 0, '첫째');
    vote(room, 'C', 'B', 0, '둘째');
    expect(room.rounds[0].reasons.map((r) => r.text)).toEqual(['둘째', '첫째']);
  });

  it.each([
    ['a self vote', 'A', 'A', 0, '', 'SELF_VOTE'],
    ['an unknown target', 'A', 'Z', 0, '', 'INVALID_TARGET'],
    ['a prediction above the voter count', 'A', 'B', 4, '', 'INVALID_PREDICTION'],
    ['a negative prediction', 'A', 'B', -1, '', 'INVALID_PREDICTION'],
    ['a fractional prediction', 'A', 'B', 1.5, '', 'INVALID_PREDICTION'],
    ['a 21-character reason', 'A', 'B', 0, '가'.repeat(21), 'REASON_TOO_LONG'],
  ])('rejects %s', (_label, voter, target, prediction, reason, expected) => {
    const room = started();
    expect(code(() => vote(room, voter, target, prediction, reason))).toBe(expected);
  });

  it('accepts a 20-character reason', () => {
    const room = started();
    expect(code(() => vote(room, 'A', 'B', 0, '가'.repeat(20)))).toBe('NO_ERROR');
  });

  it('rejects a second vote', () => {
    const room = started();
    vote(room, 'A', 'B');
    expect(code(() => vote(room, 'A', 'C'))).toBe('ALREADY_VOTED');
  });

  it('rejects pending and removed players', () => {
    const room = started();
    joinRoom(room, 'E', 'id-E', 'tk-E');
    expect(code(() => vote(room, 'E', 'A'))).toBe('NOT_ELIGIBLE');
    removePlayer(room, 'id-D');
    expect(code(() => vote(room, 'D', 'A'))).toBe('NOT_ELIGIBLE');
    expect(code(() => vote(room, 'A', 'D'))).toBe('INVALID_TARGET');
  });

  it('rejects votes outside the voting phase', () => {
    const room = started();
    vote(room, 'A', 'B');
    reveal(room, first);
    expect(code(() => vote(room, 'C', 'B'))).toBe('WRONG_PHASE');
  });
});

describe('classify', () => {
  const play = (pairs: [string, string][]) => {
    const room = started();
    for (const [voter, target] of pairs) vote(room, voter, target);
    return classify(room.rounds[0]);
  };

  it('treats 3-1 as unanimous except self', () => {
    expect(play([['A', 'D'], ['B', 'D'], ['C', 'D'], ['D', 'A']])).toEqual({ topIds: ['id-D'], type: 'unanimous' });
  });

  it('treats 2-2 as a tie', () => {
    expect(play([['A', 'B'], ['B', 'A'], ['C', 'A'], ['D', 'B']])).toEqual({ topIds: ['id-A', 'id-B'], type: 'tie' });
  });

  it('treats 2-1-1 as normal', () => {
    expect(play([['A', 'B'], ['B', 'A'], ['C', 'A'], ['D', 'C']])).toEqual({ topIds: ['id-A'], type: 'normal' });
  });

  it('treats 1-1-1-1 as scattered', () => {
    expect(play([['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']])).toEqual({
      topIds: ['id-A', 'id-B', 'id-C', 'id-D'],
      type: 'scattered',
    });
  });

  it('treats 2-1 with three players as unanimous', () => {
    const room = started(['A', 'B', 'C']);
    vote(room, 'A', 'C');
    vote(room, 'B', 'C');
    vote(room, 'C', 'A');
    expect(classify(room.rounds[0]).type).toBe('unanimous');
  });
});

describe('reveal', () => {
  it('auto-reveals exactly once when everyone has voted', () => {
    const room = started();
    vote(room, 'A', 'D');
    vote(room, 'B', 'D');
    vote(room, 'C', 'D');
    expect(maybeAutoReveal(room, first)).toBe(false);
    vote(room, 'D', 'A');
    expect(allVoted(room.rounds[0])).toBe(true);
    expect(maybeAutoReveal(room, first)).toBe(true);
    expect(maybeAutoReveal(room, first)).toBe(false);
    expect(room.phase).toBe('reveal');
    expect(room.rounds[0].result).toMatchObject({
      topIds: ['id-D'],
      type: 'unanimous',
      comment: '본인 제외 전원 일치. 이견은 없었습니다.',
    });
  });

  it('lets the operator reveal partial votes but not zero votes', () => {
    const room = started();
    expect(code(() => reveal(room, first))).toBe('NO_VOTES');
    vote(room, 'A', 'B');
    reveal(room, first);
    expect(totalVotes(room.rounds[0])).toBe(1);
    expect(room.rounds[0].result?.type).toBe('scattered');
  });

  it('auto-reveals when the only non-voter is removed', () => {
    const room = started();
    vote(room, 'A', 'B');
    vote(room, 'B', 'A');
    vote(room, 'C', 'A');
    removePlayer(room, 'id-D');
    expect(maybeAutoReveal(room, first)).toBe(true);
  });

  it('highlights the biggest prediction miss', () => {
    const room = started();
    vote(room, 'A', 'D', 1);
    vote(room, 'B', 'D', 1);
    vote(room, 'C', 'D', 1);
    vote(room, 'D', 'A', 0);
    maybeAutoReveal(room, first);
    expect(room.rounds[0].result?.prediction).toEqual({
      playerId: 'id-D', predicted: 0, actual: 3, kind: 'under', comment: '본인만 몰랐습니다.',
    });
  });

  it('praises a single winner who predicted exactly when nobody missed by 2+', () => {
    const room = started();
    vote(room, 'A', 'B', 2);
    vote(room, 'B', 'A', 1);
    vote(room, 'C', 'A', 1);
    vote(room, 'D', 'C', 0);
    maybeAutoReveal(room, first);
    expect(room.rounds[0].result?.prediction).toMatchObject({ playerId: 'id-A', kind: 'exact' });
  });

  it('shows no prediction when nothing stands out', () => {
    const room = started();
    vote(room, 'A', 'B');
    vote(room, 'B', 'C');
    vote(room, 'C', 'D');
    vote(room, 'D', 'A');
    maybeAutoReveal(room, first);
    expect(room.rounds[0].result?.prediction).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -w @ojt/game -- vote`
Expected: FAIL: `submitVote` 등이 export되지 않음.

- [ ] **Step 3: 구현**

`packages/game/src/round.ts`의 import를 아래로 바꾸고, 파일 끝에 함수들을 추가한다.

```ts
import { PREDICTION_COMMENTS, pickComment, resultPool } from './comments';
import {
  GameError, REASON_MAX,
  type PredictionHighlight, type PredictionKind, type ResultType, type Rng, type Room, type Round,
} from './types';
```

```ts
export interface VoteInput {
  targetId: string;
  reason?: string;
  prediction: number;
}

export function totalVotes(round: Round): number {
  return Object.values(round.votes).reduce((sum, n) => sum + n, 0);
}

export function allVoted(round: Round): boolean {
  return round.eligibleIds.length > 0 && round.eligibleIds.every((id) => round.votedIds.includes(id));
}

export function submitVote(room: Room, voterId: string, input: VoteInput, reasonId: string, rng: Rng): void {
  if (room.phase !== 'voting') throw new GameError('WRONG_PHASE');
  const round = currentRound(room);
  if (!round.eligibleIds.includes(voterId)) throw new GameError('NOT_ELIGIBLE');
  if (round.votedIds.includes(voterId)) throw new GameError('ALREADY_VOTED');
  if (input.targetId === voterId) throw new GameError('SELF_VOTE');
  if (!round.eligibleIds.includes(input.targetId)) throw new GameError('INVALID_TARGET');
  const maxPrediction = round.eligibleIds.length - 1;
  if (!Number.isInteger(input.prediction) || input.prediction < 0 || input.prediction > maxPrediction) {
    throw new GameError('INVALID_PREDICTION');
  }
  const reason = (input.reason ?? '').trim();
  if (Array.from(reason).length > REASON_MAX) throw new GameError('REASON_TOO_LONG');

  round.votes[input.targetId] = (round.votes[input.targetId] ?? 0) + 1;
  round.votedIds.push(voterId);
  round.predictions[voterId] = input.prediction;
  if (reason) {
    // Random position: arrival order would otherwise line up with the public check marks.
    const at = Math.floor(rng() * (round.reasons.length + 1));
    round.reasons.splice(at, 0, { id: reasonId, targetId: input.targetId, text: reason, hidden: false });
  }
}

export function classify(round: Round): { topIds: string[]; type: ResultType } {
  const counts = round.eligibleIds.map((id) => ({ id, votes: round.votes[id] ?? 0 }));
  const top = Math.max(0, ...counts.map((c) => c.votes));
  const topIds = top > 0 ? counts.filter((c) => c.votes === top).map((c) => c.id) : [];
  let type: ResultType;
  if (topIds.length === 1 && top === round.eligibleIds.length - 1) type = 'unanimous';
  else if (topIds.length >= 2 && top >= 2) type = 'tie';
  else if (top === 1) type = 'scattered';
  else type = 'normal';
  return { topIds, type };
}

function predictionHighlight(round: Round, topIds: string[], used: string[], rng: Rng): PredictionHighlight | null {
  const rows = round.eligibleIds
    .filter((id) => id in round.predictions)
    .map((id, order) => {
      const actual = round.votes[id] ?? 0;
      const predicted = round.predictions[id] as number;
      return { id, order, actual, predicted, diff: Math.abs(actual - predicted) };
    });
  const bigMiss = rows
    .filter((r) => r.diff >= 2)
    .sort((a, b) => b.diff - a.diff || b.actual - a.actual || a.order - b.order)[0];

  let pick = bigMiss;
  let kind: PredictionKind | null = bigMiss ? (bigMiss.actual > bigMiss.predicted ? 'under' : 'over') : null;
  if (!pick && topIds.length === 1) {
    const winner = rows.find((r) => r.id === topIds[0]);
    if (winner && winner.diff === 0) {
      pick = winner;
      kind = 'exact';
    }
  }
  if (!pick || !kind) return null;
  return {
    playerId: pick.id,
    predicted: pick.predicted,
    actual: pick.actual,
    kind,
    comment: pickComment(PREDICTION_COMMENTS[kind], used, rng),
  };
}

export function reveal(room: Room, rng: Rng): void {
  if (room.phase !== 'voting') throw new GameError('WRONG_PHASE');
  const round = currentRound(room);
  if (totalVotes(round) === 0) throw new GameError('NO_VOTES');
  const { topIds, type } = classify(round);
  const comment = pickComment(resultPool(type, topIds.length), room.usedComments, rng);
  round.result = { topIds, type, comment, prediction: predictionHighlight(round, topIds, room.usedComments, rng) };
  room.phase = 'reveal';
}

/** Reveals when every eligible player has voted. Safe to call after any change; returns whether it revealed. */
export function maybeAutoReveal(room: Room, rng: Rng): boolean {
  if (room.phase !== 'voting') return false;
  const round = currentRound(room);
  if (!allVoted(round) || totalVotes(round) === 0) return false;
  reveal(room, rng);
  return true;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -w @ojt/game && npm run typecheck -w @ojt/game`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(game): voting and result classification" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: 결과 이후 진행 (이유, 억울, 다음 문제, 건너뛰기, 종료와 칭호)

**Files:**
- Modify: `packages/game/src/round.ts`
- Create: `packages/game/src/titles.ts`
- Modify: `packages/game/src/room.ts`, `packages/game/src/index.ts`
- Modify: `packages/game/test/helpers.ts`
- Test: `packages/game/test/results.test.ts`

**Interfaces:**
- Consumes: Task 3의 `reveal`, `maybeAutoReveal`, `totalVotes`, `newRound`, `startRound`
- Produces:
  - `round.ts`: `showReasons(room, rng): void`, `hideReason(room, reasonId): void`, `protest(room, playerId): void`, `isLastRound(room): boolean`, `nextRound(room): void`, `usableSpareIds(room): string[]`, `skipQuestion(room): void`
  - `titles.ts`: `MYSTERY_TITLE`, `MYSTERY_NOTE`, `assignTitles(room): Title[]`
  - `room.ts`: `finish(room, now): void`
  - test helper `revealUnanimousD(room): void`

- [ ] **Step 1: 도우미 추가와 실패하는 테스트 작성**

`packages/game/test/helpers.ts`의 import에 `maybeAutoReveal`을 추가하고, 맨 아래에 추가:

```ts
/** A,B,C vote D (each with a reason), D votes A, then auto-reveal. */
export function revealUnanimousD(room: Room): void {
  vote(room, 'A', 'D', 0, '좀비 영화 마니아');
  vote(room, 'B', 'D', 0, '창고가 있음');
  vote(room, 'C', 'D', 0, '준비성 최고');
  vote(room, 'D', 'A', 0, '그냥');
  maybeAutoReveal(room, first);
}
```

수정 후 helpers.ts의 import 줄:

```ts
import { GameError, createRoom, joinRoom, maybeAutoReveal, startGame, submitVote, type Rng, type Room } from '../src';
```

`packages/game/test/results.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  MAIN_IDS, MYSTERY_TITLE, finish, hideReason, isLastRound, maybeAutoReveal, nextRound,
  protest, reveal, showReasons, skipQuestion, usableSpareIds,
} from '../src';
import { code, first, lobby, revealUnanimousD, started, vote } from './helpers';

function playToLastRound(room: ReturnType<typeof started>) {
  while (!isLastRound(room)) {
    vote(room, 'A', 'B');
    reveal(room, first);
    nextRound(room);
  }
}

describe('reasons', () => {
  it('shows at most two reasons, only those written for the winner', () => {
    const room = started();
    revealUnanimousD(room);
    showReasons(room, first);
    const round = room.rounds[0];
    expect(round.shownReasonIds).toHaveLength(2);
    for (const id of round.shownReasonIds ?? []) {
      expect(round.reasons.find((r) => r.id === id)?.targetId).toBe('id-D');
    }
  });

  it('never shows hidden reasons and pulls a shown one off when hidden', () => {
    const room = started();
    revealUnanimousD(room);
    const round = room.rounds[0];
    const forD = round.reasons.filter((r) => r.targetId === 'id-D');
    hideReason(room, forD[0].id);
    hideReason(room, forD[1].id);
    showReasons(room, first);
    expect(round.shownReasonIds).toEqual([forD[2].id]);
    hideReason(room, forD[2].id);
    expect(round.shownReasonIds).toEqual([]);
  });

  it('rejects unknown reason ids and use outside the result phase', () => {
    const room = started();
    expect(code(() => showReasons(room, first))).toBe('WRONG_PHASE');
    revealUnanimousD(room);
    expect(code(() => hideReason(room, 'nope'))).toBe('REASON_NOT_FOUND');
  });
});

describe('protest', () => {
  it('lets only the winner protest, once per round', () => {
    const room = started();
    revealUnanimousD(room);
    expect(code(() => protest(room, 'id-A'))).toBe('NOT_TOP');
    protest(room, 'id-D');
    expect(room.rounds[0].protestedIds).toEqual(['id-D']);
    expect(code(() => protest(room, 'id-D'))).toBe('ALREADY_PROTESTED');
  });
});

describe('nextRound', () => {
  it('walks the curated order and stops after round 7', () => {
    const room = started();
    expect(code(() => nextRound(room))).toBe('WRONG_PHASE');
    playToLastRound(room);
    expect(room.rounds.map((r) => r.questionId)).toEqual(MAIN_IDS);
    vote(room, 'A', 'B');
    reveal(room, first);
    expect(code(() => nextRound(room))).toBe('LAST_ROUND');
  });
});

describe('skipQuestion', () => {
  it('swaps the current question for the next spare and drops its votes', () => {
    const room = started();
    vote(room, 'A', 'B');
    skipQuestion(room);
    expect(room.rounds).toHaveLength(1);
    expect(room.rounds[0].questionId).toBe('festival');
    expect(room.rounds[0].votedIds).toEqual([]);
  });

  it('never adds a second mistake-type question while one is still ahead', () => {
    const room = started();
    skipQuestion(room);
    skipQuestion(room);
    expect(usableSpareIds(room)).toEqual([]);
    expect(code(() => skipQuestion(room))).toBe('NO_SPARE');
  });

  it('allows the mistake-type spare once the mistake-type main question is skipped', () => {
    const room = started();
    playToLastRound(room);
    expect(room.rounds[6].questionId).toBe('karaoke');
    skipQuestion(room);
    skipQuestion(room);
    skipQuestion(room);
    expect(room.rounds[6].questionId).toBe('passport');
  });
});

describe('finish', () => {
  it('cannot finish from the lobby', () => {
    expect(code(() => finish(lobby(['A', 'B', 'C']), 1))).toBe('WRONG_PHASE');
  });

  it('drops an unrevealed round when ending early', () => {
    const room = started();
    revealUnanimousD(room);
    nextRound(room);
    vote(room, 'A', 'B');
    finish(room, 9000);
    expect(room.rounds).toHaveLength(1);
    expect(room.phase).toBe('final');
    expect(room.endedAt).toBe(9000);
  });

  it('gives each player one unique title and a mystery title to the rest', () => {
    const room = started();
    // Round 1 (alien): D gets 3 of 4, A gets 1.
    revealUnanimousD(room);
    nextRound(room);
    // Round 2 (island): A 2, B 2.
    vote(room, 'A', 'B');
    vote(room, 'B', 'A');
    vote(room, 'C', 'A');
    vote(room, 'D', 'B');
    maybeAutoReveal(room, first);
    nextRound(room);
    // Round 3 (zombie): D 3, C 1.
    vote(room, 'A', 'D');
    vote(room, 'B', 'D');
    vote(room, 'C', 'D');
    vote(room, 'D', 'C');
    maybeAutoReveal(room, first);
    finish(room, 9000);
    expect(room.titles).toEqual([
      { playerId: 'id-A', title: '무인도 정착 담당', questionId: 'island' },
      { playerId: 'id-B', title: MYSTERY_TITLE, questionId: null },
      { playerId: 'id-C', title: '좀비 사태 생존 담당', questionId: 'zombie' },
      { playerId: 'id-D', title: '외계인과 셀카 찍을 사람', questionId: 'alien' },
    ]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -w @ojt/game -- results`
Expected: FAIL: `showReasons` 등이 export되지 않음.

- [ ] **Step 3: round.ts에 결과 이후 진행 추가**

`packages/game/src/round.ts` import에 `getQuestion`과 `TOTAL_ROUNDS`를 추가한다:

```ts
import { PREDICTION_COMMENTS, pickComment, resultPool } from './comments';
import { getQuestion } from './questions';
import {
  GameError, REASON_MAX, TOTAL_ROUNDS,
  type PredictionHighlight, type PredictionKind, type ResultType, type Rng, type Room, type Round,
} from './types';
```

파일 끝에 추가:

```ts
function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

function revealedRound(room: Room): Round & { result: NonNullable<Round['result']> } {
  if (room.phase !== 'reveal') throw new GameError('WRONG_PHASE');
  const round = currentRound(room);
  if (!round.result) throw new GameError('WRONG_PHASE');
  return round as Round & { result: NonNullable<Round['result']> };
}

export function showReasons(room: Room, rng: Rng): void {
  const round = revealedRound(room);
  const candidates = round.reasons.filter((r) => !r.hidden && round.result.topIds.includes(r.targetId));
  round.shownReasonIds = shuffle(candidates, rng).slice(0, 2).map((r) => r.id);
}

export function hideReason(room: Room, reasonId: string): void {
  const round = revealedRound(room);
  const reason = round.reasons.find((r) => r.id === reasonId);
  if (!reason) throw new GameError('REASON_NOT_FOUND');
  reason.hidden = true;
  if (round.shownReasonIds) round.shownReasonIds = round.shownReasonIds.filter((id) => id !== reasonId);
}

export function protest(room: Room, playerId: string): void {
  const round = revealedRound(room);
  if (!round.result.topIds.includes(playerId)) throw new GameError('NOT_TOP');
  if (round.protestedIds.includes(playerId)) throw new GameError('ALREADY_PROTESTED');
  round.protestedIds.push(playerId);
}

export function isLastRound(room: Room): boolean {
  return room.rounds.length >= TOTAL_ROUNDS;
}

export function nextRound(room: Room): void {
  revealedRound(room);
  if (isLastRound(room)) throw new GameError('LAST_ROUND');
  const questionId = room.mainQueue.shift();
  if (!questionId) throw new GameError('LAST_ROUND');
  startRound(room, questionId);
}

/** Spares that keep the game at one mistake-type question at most. The current round is about to be discarded, so it does not count. */
export function usableSpareIds(room: Room): string[] {
  const played = room.rounds.slice(0, -1).some((r) => getQuestion(r.questionId).mistake);
  const ahead = room.mainQueue.some((id) => getQuestion(id).mistake);
  const blocked = played || ahead;
  return room.spareQueue.filter((id) => !(blocked && getQuestion(id).mistake));
}

export function skipQuestion(room: Room): void {
  if (room.phase !== 'voting') throw new GameError('WRONG_PHASE');
  const next = usableSpareIds(room)[0];
  if (!next) throw new GameError('NO_SPARE');
  room.spareQueue = room.spareQueue.filter((id) => id !== next);
  const index = room.rounds.length - 1;
  room.rounds[index] = newRound(room, next, index);
}
```

- [ ] **Step 4: 칭호 배정과 종료 구현**

`packages/game/src/titles.ts`:

```ts
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
```

`packages/game/src/room.ts` import에 `assignTitles`를 추가하고 파일 끝에 추가:

```ts
import { assignTitles } from './titles';
```

```ts
/** Normal end after the last result, or early end from voting/result. An unrevealed round is discarded. */
export function finish(room: Room, now: number): void {
  if (room.phase !== 'voting' && room.phase !== 'reveal') throw new GameError('WRONG_PHASE');
  if (room.phase === 'voting') room.rounds.pop();
  room.titles = assignTitles(room);
  room.phase = 'final';
  room.endedAt = now;
}
```

`packages/game/src/index.ts`에 추가:

```ts
export * from './titles';
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -w @ojt/game && npm run typecheck -w @ojt/game`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(game): reasons, protests, round flow and titles" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: 역할별 화면 상태 (무대 / 운영자 / 참가자)

**Files:**
- Create: `packages/game/src/views.ts`
- Modify: `packages/game/src/index.ts`
- Test: `packages/game/test/views.test.ts`

**Interfaces:**
- Consumes: Task 2~4의 함수들
- Produces (화면 코드가 그대로 쓰는 타입):

```ts
interface PublicPlayer { id: string; name: string; connected: boolean; status: 'active' | 'pending' }
interface RoundInfo { number: number; total: number; question: string; eligibleIds: string[]; votedIds: string[] }
interface ResultInfo {
  counts: { playerId: string; votes: number }[];
  topIds: string[]; type: ResultType; comment: string;
  prediction: PredictionHighlight | null;
  reasons: string[] | null;          // null = 운영자가 아직 "이유 보기"를 누르지 않음
  protestedIds: string[];
}
interface TitleInfo { playerId: string; name: string; title: string; note: string | null }
interface StageView { role: 'stage'; code: string; phase: Phase; players: PublicPlayer[]; round: RoundInfo | null; result: ResultInfo | null; titles: TitleInfo[] | null; startedAt: number | null; endedAt: number | null }
interface OperatorView extends Omit<StageView, 'role'> { role: 'operator'; reasons: OperatorReason[]; isLastRound: boolean; spareLeft: number }
interface OperatorReason { id: string; targetName: string; text: string; hidden: boolean }
interface PlayerRoundInfo { number: number; total: number; question: string; candidates: { id: string; name: string }[]; hasVoted: boolean; votedCount: number; eligibleCount: number; maxPrediction: number }
interface PlayerView { role: 'player'; code: string; phase: Phase; me: { id: string; name: string; status: PlayerStatus; eligible: boolean }; round: PlayerRoundInfo | null; isTop: boolean; hasProtested: boolean; playerCount: number }
viewForStage(room): StageView
viewForOperator(room): OperatorView
viewForPlayer(room, playerId): PlayerView   // throws PLAYER_NOT_FOUND
```

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/game/test/views.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { joinRoom, removePlayer, showReasons, viewForOperator, viewForPlayer, viewForStage } from '../src';
import { code, first, revealUnanimousD, started, vote } from './helpers';

describe('viewForPlayer', () => {
  it('lists the other eligible players as candidates', () => {
    const room = started();
    const view = viewForPlayer(room, 'id-A');
    expect(view.round?.candidates.map((c) => c.name)).toEqual(['B', 'C', 'D']);
    expect(view.round?.maxPrediction).toBe(3);
    expect(view.me).toMatchObject({ name: 'A', status: 'active', eligible: true });
    expect(view.playerCount).toBe(4);
  });

  it('never leaks other players predictions or reasons', () => {
    const room = started();
    vote(room, 'B', 'A', 2, '비밀 이유');
    const json = JSON.stringify(viewForPlayer(room, 'id-A'));
    expect(json).not.toContain('비밀 이유');
    expect(json).not.toContain('predictions');
  });

  it('reports hasVoted so a phone that wakes up shows the waiting screen', () => {
    const room = started();
    vote(room, 'A', 'B');
    expect(viewForPlayer(room, 'id-A').round).toMatchObject({ hasVoted: true, votedCount: 1, eligibleCount: 4 });
    expect(viewForPlayer(room, 'id-B').round?.hasVoted).toBe(false);
  });

  it('flags the winner for the big protest button', () => {
    const room = started();
    revealUnanimousD(room);
    expect(viewForPlayer(room, 'id-D').isTop).toBe(true);
    expect(viewForPlayer(room, 'id-A').isTop).toBe(false);
  });

  it('marks pending late joiners as not eligible', () => {
    const room = started();
    joinRoom(room, 'E', 'id-E', 'tk-E');
    expect(viewForPlayer(room, 'id-E').me).toMatchObject({ status: 'pending', eligible: false });
  });

  it('throws for unknown players', () => {
    expect(code(() => viewForPlayer(started(), 'nope'))).toBe('PLAYER_NOT_FOUND');
  });
});

describe('viewForStage', () => {
  it('hides reasons until the operator shows them', () => {
    const room = started();
    revealUnanimousD(room);
    expect(viewForStage(room).result?.reasons).toBeNull();
    showReasons(room, first);
    expect(viewForStage(room).result?.reasons).toHaveLength(2);
  });

  it('shows counts per eligible player but no individual predictions', () => {
    const room = started();
    revealUnanimousD(room);
    const view = viewForStage(room);
    expect(view.result?.counts).toEqual([
      { playerId: 'id-A', votes: 1 },
      { playerId: 'id-B', votes: 0 },
      { playerId: 'id-C', votes: 0 },
      { playerId: 'id-D', votes: 3 },
    ]);
    expect(JSON.stringify(view)).not.toContain('predictions');
    expect(JSON.stringify(view)).not.toContain('token');
  });

  it('hides removed players', () => {
    const room = started();
    removePlayer(room, 'id-D');
    expect(viewForStage(room).players.map((p) => p.name)).toEqual(['A', 'B', 'C']);
  });
});

describe('viewForOperator', () => {
  it('previews every reason written for the winner', () => {
    const room = started();
    revealUnanimousD(room);
    const reasons = viewForOperator(room).reasons;
    expect(reasons.map((r) => r.targetName)).toEqual(['D', 'D', 'D']);
    expect(reasons.every((r) => !r.hidden)).toBe(true);
  });

  it('reports how many spares can still be used', () => {
    expect(viewForOperator(started()).spareLeft).toBe(2);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -w @ojt/game -- views`
Expected: FAIL: `viewForStage` 등이 export되지 않음.

- [ ] **Step 3: 구현**

`packages/game/src/views.ts`:

```ts
import { getQuestion } from './questions';
import { isLastRound, usableSpareIds } from './round';
import { MYSTERY_NOTE } from './titles';
import {
  GameError, TOTAL_ROUNDS,
  type Phase, type PlayerStatus, type PredictionHighlight, type ResultType, type Room, type Round,
} from './types';

export interface PublicPlayer { id: string; name: string; connected: boolean; status: 'active' | 'pending' }
export interface RoundInfo { number: number; total: number; question: string; eligibleIds: string[]; votedIds: string[] }
export interface ResultInfo {
  counts: { playerId: string; votes: number }[];
  topIds: string[];
  type: ResultType;
  comment: string;
  prediction: PredictionHighlight | null;
  /** null until the operator presses "이유 보기". */
  reasons: string[] | null;
  protestedIds: string[];
}
export interface TitleInfo { playerId: string; name: string; title: string; note: string | null }
export interface StageView {
  role: 'stage';
  code: string;
  phase: Phase;
  players: PublicPlayer[];
  round: RoundInfo | null;
  result: ResultInfo | null;
  titles: TitleInfo[] | null;
  startedAt: number | null;
  endedAt: number | null;
}
export interface OperatorReason { id: string; targetName: string; text: string; hidden: boolean }
export interface OperatorView extends Omit<StageView, 'role'> {
  role: 'operator';
  reasons: OperatorReason[];
  isLastRound: boolean;
  spareLeft: number;
}
export interface PlayerRoundInfo {
  number: number;
  total: number;
  question: string;
  candidates: { id: string; name: string }[];
  hasVoted: boolean;
  votedCount: number;
  eligibleCount: number;
  maxPrediction: number;
}
export interface PlayerView {
  role: 'player';
  code: string;
  phase: Phase;
  me: { id: string; name: string; status: PlayerStatus; eligible: boolean };
  round: PlayerRoundInfo | null;
  isTop: boolean;
  hasProtested: boolean;
  /** Active players, for the lobby screen. */
  playerCount: number;
}

function nameOf(room: Room, id: string): string {
  return room.players.find((p) => p.id === id)?.name ?? '';
}

function liveRound(room: Room): Round | null {
  const round = room.rounds.at(-1);
  return round && (room.phase === 'voting' || room.phase === 'reveal') ? round : null;
}

function roundInfo(room: Room): RoundInfo | null {
  const round = liveRound(room);
  if (!round) return null;
  return {
    number: room.rounds.length,
    total: TOTAL_ROUNDS,
    question: getQuestion(round.questionId).text,
    eligibleIds: [...round.eligibleIds],
    votedIds: [...round.votedIds],
  };
}

function resultInfo(room: Room): ResultInfo | null {
  const round = liveRound(room);
  if (room.phase !== 'reveal' || !round?.result) return null;
  const textOf = (id: string) => round.reasons.find((r) => r.id === id)?.text ?? '';
  return {
    counts: round.eligibleIds.map((playerId) => ({ playerId, votes: round.votes[playerId] ?? 0 })),
    topIds: [...round.result.topIds],
    type: round.result.type,
    comment: round.result.comment,
    prediction: round.result.prediction,
    reasons: round.shownReasonIds ? round.shownReasonIds.map(textOf) : null,
    protestedIds: [...round.protestedIds],
  };
}

function titleInfo(room: Room): TitleInfo[] | null {
  if (!room.titles) return null;
  return room.titles.map((t) => ({
    playerId: t.playerId,
    name: nameOf(room, t.playerId),
    title: t.title,
    note: t.questionId ? null : MYSTERY_NOTE,
  }));
}

export function viewForStage(room: Room): StageView {
  return {
    role: 'stage',
    code: room.code,
    phase: room.phase,
    players: room.players
      .filter((p) => p.status !== 'removed')
      .map((p) => ({ id: p.id, name: p.name, connected: p.connected, status: p.status === 'pending' ? 'pending' : 'active' })),
    round: roundInfo(room),
    result: resultInfo(room),
    titles: titleInfo(room),
    startedAt: room.startedAt,
    endedAt: room.endedAt,
  };
}

export function viewForOperator(room: Room): OperatorView {
  const stage = viewForStage(room);
  const round = liveRound(room);
  const topIds = room.phase === 'reveal' && round?.result ? round.result.topIds : [];
  const reasons = round
    ? round.reasons
        .filter((r) => topIds.includes(r.targetId))
        .map((r) => ({ id: r.id, targetName: nameOf(room, r.targetId), text: r.text, hidden: r.hidden }))
    : [];
  return { ...stage, role: 'operator', reasons, isLastRound: isLastRound(room), spareLeft: usableSpareIds(room).length };
}

export function viewForPlayer(room: Room, playerId: string): PlayerView {
  const me = room.players.find((p) => p.id === playerId);
  if (!me) throw new GameError('PLAYER_NOT_FOUND');
  const round = liveRound(room);
  return {
    role: 'player',
    code: room.code,
    phase: room.phase,
    me: { id: me.id, name: me.name, status: me.status, eligible: !!round && round.eligibleIds.includes(playerId) },
    round: round
      ? {
          number: room.rounds.length,
          total: TOTAL_ROUNDS,
          question: getQuestion(round.questionId).text,
          candidates: round.eligibleIds.filter((id) => id !== playerId).map((id) => ({ id, name: nameOf(room, id) })),
          hasVoted: round.votedIds.includes(playerId),
          votedCount: round.votedIds.length,
          eligibleCount: round.eligibleIds.length,
          maxPrediction: Math.max(0, round.eligibleIds.length - 1),
        }
      : null,
    isTop: !!round?.result?.topIds.includes(playerId),
    hasProtested: !!round?.protestedIds.includes(playerId),
    playerCount: room.players.filter((p) => p.status === 'active').length,
  };
}
```

`packages/game/src/index.ts`에 추가:

```ts
export * from './views';
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -w @ojt/game && npm run typecheck -w @ojt/game`
Expected: PASS (전체 게임 테스트).

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(game): role-specific views" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: 실시간 서버 (Socket.IO)

**Files:**
- Create: `apps/server/package.json`, `apps/server/tsconfig.json`
- Create: `apps/server/src/store.ts`, `apps/server/src/app.ts`, `apps/server/src/index.ts`
- Test: `apps/server/test/app.test.ts`

**Interfaces:**
- Consumes: `@ojt/game` 전체 공개 API
- Produces: 화면이 쓰는 Socket.IO 프로토콜. 모든 클라이언트 요청은 ack 콜백으로 `{ ok: true, ...extra }` 또는 `{ ok: false, code }`를 받는다.

| 이벤트 (클라이언트 → 서버) | payload | 성공 시 extra | 권한 |
| --- | --- | --- | --- |
| `room:create` | `{}` | `{ code, operatorToken }` | 누구나 (보낸 소켓이 운영자가 됨) |
| `op:auth` | `{ code, token }` | | 토큰 일치 |
| `stage:watch` | `{ code }` | | 누구나 |
| `player:join` | `{ code, name }` | `{ playerId, token }` | 누구나 |
| `player:resume` | `{ code, playerId, token }` | | 토큰 일치 |
| `player:vote` | `{ targetId, reason, prediction }` | | 참가자 |
| `player:react` | `{ kind: 'lol' \| 'agree' \| 'unfair' }` | | 참가자, 결과 단계, 초당 2회 |
| `op:start` `op:reveal` `op:showReasons` `op:next` `op:skip` `op:finish` `op:end` | `{}` | | 운영자 |
| `op:hideReason` | `{ reasonId }` | | 운영자 |
| `op:rename` | `{ playerId, name }` | | 운영자 |
| `op:remove` `op:admit` | `{ playerId }` | | 운영자 |

| 이벤트 (서버 → 클라이언트) | payload |
| --- | --- |
| `state` | 역할에 맞는 `StageView` / `OperatorView` / `PlayerView` |
| `reaction` | `{ kind }` (무대 화면에만) |
| `closed` | 없음 (방 삭제됨) |

- `createApp({ origin, now?, rng?, sweepMs?, revealDelayMs? }): App` (전원 투표 후 자동 공개까지 기본 900ms): `App = { http, io, rooms, sweep(): void, close(): Promise<void> }`

- [ ] **Step 1: 서버 패키지 설정과 의존성 설치**

`apps/server/package.json`:

```json
{
  "name": "@ojt/server",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts --format esm --platform node --target node22 --noExternal @ojt/game --clean",
    "start": "node dist/index.js",
    "test": "vitest run",
    "typecheck": "tsc --noEmit -p ."
  },
  "dependencies": {
    "@ojt/game": "*"
  }
}
```

`apps/server/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["node"] },
  "include": ["src", "test"]
}
```

```bash
npm install socket.io -w @ojt/server
npm install -D tsx tsup @types/node socket.io-client -w @ojt/server
```

- [ ] **Step 2: 실패하는 테스트 작성**

`apps/server/test/app.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { ROOM_TTL_MS, type OperatorView, type PlayerView, type StageView } from '@ojt/game';
import { createApp, type App } from '../src/app';

type Ack = { ok: boolean; code?: string; [key: string]: unknown };

let app: App;
let url: string;
let clock = 0;
let sockets: Socket[] = [];

beforeEach(async () => {
  clock = 0;
  app = createApp({ origin: true, now: () => clock, rng: () => 0, revealDelayMs: 0 });
  await new Promise<void>((resolve) => app.http.listen(0, resolve));
  url = `http://localhost:${(app.http.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const s of sockets) s.disconnect();
  sockets = [];
  await app.close();
});

async function client(): Promise<Socket> {
  const socket = connect(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  sockets.push(socket);
  await new Promise<void>((resolve) => socket.on('connect', () => resolve()));
  return socket;
}

function call(socket: Socket, event: string, payload: object = {}): Promise<Ack> {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

function latest<T>(socket: Socket): { get: () => T | null } {
  let value: T | null = null;
  socket.on('state', (next: T) => {
    value = next;
  });
  return { get: () => value };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

async function setupGame(names = ['A', 'B', 'C', 'D']) {
  const op = await client();
  const created = await call(op, 'room:create');
  const code = created.code as string;
  const stage = await client();
  const stageState = latest<StageView>(stage);
  await call(stage, 'stage:watch', { code });
  const players = [];
  for (const name of names) {
    const socket = await client();
    const state = latest<PlayerView>(socket);
    const res = await call(socket, 'player:join', { code, name });
    players.push({ socket, state, id: res.playerId as string, token: res.token as string });
  }
  return { op, code, operatorToken: created.operatorToken as string, stage, stageState, players };
}

describe('realtime server', () => {
  it('answers health checks', async () => {
    const res = await fetch(`${url}/health`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  it('plays a round end to end and keeps votes anonymous', async () => {
    const g = await setupGame();
    expect((await call(g.op, 'op:start')).ok).toBe(true);
    const [a, b, c, d] = g.players;
    await call(a.socket, 'player:vote', { targetId: d.id, prediction: 0, reason: '준비성' });
    await call(b.socket, 'player:vote', { targetId: d.id, prediction: 0 });
    await call(c.socket, 'player:vote', { targetId: d.id, prediction: 0 });
    await call(d.socket, 'player:vote', { targetId: a.id, prediction: 0 });
    await settle();
    const stage = g.stageState.get();
    expect(stage?.phase).toBe('reveal');
    expect(stage?.result?.type).toBe('unanimous');
    expect(stage?.result?.reasons).toBeNull();
    expect(JSON.stringify(stage)).not.toContain('준비성');
    expect(JSON.stringify(stage)).not.toContain('predictions');
    expect(d.state.get()?.isTop).toBe(true);
  });

  it('rejects operator actions from non-operators', async () => {
    const g = await setupGame();
    expect(await call(g.players[0].socket, 'op:start')).toEqual({ ok: false, code: 'UNAUTHORIZED' });
  });

  it('restores the operator after a refresh but not with a wrong token', async () => {
    const g = await setupGame();
    g.op.disconnect();
    const intruder = await client();
    expect(await call(intruder, 'op:auth', { code: g.code, token: 'nope' })).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    const op2 = await client();
    const state = latest<OperatorView>(op2);
    expect((await call(op2, 'op:auth', { code: g.code, token: g.operatorToken })).ok).toBe(true);
    expect((await call(op2, 'op:start')).ok).toBe(true);
    await settle();
    expect(state.get()?.phase).toBe('voting');
  });

  it('brings a phone back as the same player after it sleeps', async () => {
    const g = await setupGame();
    await call(g.op, 'op:start');
    const a = g.players[0];
    await call(a.socket, 'player:vote', { targetId: g.players[1].id, prediction: 0 });
    a.socket.disconnect();
    await settle();
    expect(g.stageState.get()?.players.find((p) => p.id === a.id)?.connected).toBe(false);
    const again = await client();
    const state = latest<PlayerView>(again);
    expect((await call(again, 'player:resume', { code: g.code, playerId: a.id, token: a.token })).ok).toBe(true);
    await settle();
    expect(state.get()?.round?.hasVoted).toBe(true);
    expect(g.stageState.get()?.players.find((p) => p.id === a.id)?.connected).toBe(true);
  });

  it('shows "everyone voted" before revealing, so the last vote gets its moment', async () => {
    await app.close();
    app = createApp({ origin: true, now: () => clock, rng: () => 0, revealDelayMs: 300 });
    await new Promise<void>((resolve) => app.http.listen(0, resolve));
    url = `http://localhost:${(app.http.address() as AddressInfo).port}`;
    const g = await setupGame(['A', 'B', 'C']);
    await call(g.op, 'op:start');
    const [a, b, c] = g.players;
    await call(a.socket, 'player:vote', { targetId: b.id, prediction: 0 });
    await call(b.socket, 'player:vote', { targetId: a.id, prediction: 0 });
    await call(c.socket, 'player:vote', { targetId: a.id, prediction: 0 });
    await settle();
    expect(g.stageState.get()).toMatchObject({ phase: 'voting', round: { votedIds: [a.id, b.id, c.id] } });
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(g.stageState.get()?.phase).toBe('reveal');
  });

  it('handles the last two votes arriving together', async () => {
    const g = await setupGame();
    await call(g.op, 'op:start');
    const [a, b, c, d] = g.players;
    await call(a.socket, 'player:vote', { targetId: b.id, prediction: 0 });
    await call(b.socket, 'player:vote', { targetId: a.id, prediction: 0 });
    const both = await Promise.all([
      call(c.socket, 'player:vote', { targetId: a.id, prediction: 0 }),
      call(d.socket, 'player:vote', { targetId: a.id, prediction: 0 }),
    ]);
    expect(both.every((r) => r.ok)).toBe(true);
    await settle();
    const result = g.stageState.get()?.result;
    expect(result?.counts.reduce((sum, x) => sum + x.votes, 0)).toBe(4);
    expect(result?.topIds).toEqual([a.id]);
  });

  it('forwards reactions to the stage with a rate limit', async () => {
    const g = await setupGame();
    await call(g.op, 'op:start');
    const [a, b, c, d] = g.players;
    expect(await call(a.socket, 'player:react', { kind: 'lol' })).toEqual({ ok: false, code: 'WRONG_PHASE' });
    for (const p of [a, b, c]) await call(p.socket, 'player:vote', { targetId: d.id, prediction: 0 });
    await call(d.socket, 'player:vote', { targetId: a.id, prediction: 0 });
    await settle(); // the automatic reveal runs on a timer, even when the delay is 0
    const seen: string[] = [];
    g.stage.on('reaction', (r: { kind: string }) => seen.push(r.kind));
    expect((await call(a.socket, 'player:react', { kind: 'lol' })).ok).toBe(true);
    expect((await call(a.socket, 'player:react', { kind: 'agree' })).ok).toBe(true);
    expect(await call(a.socket, 'player:react', { kind: 'lol' })).toEqual({ ok: false, code: 'RATE_LIMITED' });
    expect(await call(b.socket, 'player:react', { kind: 'boo' })).toEqual({ ok: false, code: 'INVALID_REACTION' });
    expect((await call(d.socket, 'player:react', { kind: 'unfair' })).ok).toBe(true);
    await settle();
    expect(seen).toEqual(['lol', 'agree', 'unfair']);
    expect(g.stageState.get()?.result?.protestedIds).toEqual([d.id]);
  });

  it('deletes the room when the operator ends the game', async () => {
    const g = await setupGame(['A', 'B', 'C']);
    let closed = 0;
    for (const s of [g.stage, ...g.players.map((p) => p.socket)]) s.on('closed', () => { closed += 1; });
    expect((await call(g.op, 'op:end')).ok).toBe(true);
    await settle();
    expect(closed).toBe(4);
    const late = await client();
    expect(await call(late, 'stage:watch', { code: g.code })).toEqual({ ok: false, code: 'ROOM_NOT_FOUND' });
  });

  it('expires rooms two hours after creation', async () => {
    const g = await setupGame(['A', 'B', 'C']);
    clock = ROOM_TTL_MS + 1;
    app.sweep();
    expect(app.rooms.get(g.code)).toBeUndefined();
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -w @ojt/server`
Expected: FAIL: `Cannot find module '../src/app'`.

- [ ] **Step 4: 구현**

`apps/server/src/store.ts`:

```ts
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

  expired(now: number, ttlMs: number): Room[] {
    return [...this.rooms.values()].filter((room) => now - room.createdAt > ttlMs);
  }
}
```

`apps/server/src/app.ts`:

```ts
import { createServer, type Server as HttpServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Server, type Socket } from 'socket.io';
import {
  GameError, REACTION_KINDS, ROOM_TTL_MS,
  admitPlayer, allVoted, createRoom, findPlayer, finish, hideReason, joinRoom, maybeAutoReveal, nextRound, protest,
  removePlayer, renamePlayer, reveal, showReasons, skipQuestion, startGame, submitVote,
  viewForOperator, viewForPlayer, viewForStage,
  type ReactionKind, type Rng, type Room,
} from '@ojt/game';
import { RoomStore } from './store';

type Role = 'stage' | 'operator' | 'player';
interface SocketData { code?: string; role?: Role; playerId?: string }
type AckResponse = { ok: true; [key: string]: unknown } | { ok: false; code: string };
type Payload = Record<string, unknown>;

export interface AppOptions {
  /** Allowed web origins, or true to allow any (local development). */
  origin: string[] | true;
  now?: () => number;
  rng?: Rng;
  sweepMs?: number;
  /** Pause between "everyone voted" and the automatic reveal. */
  revealDelayMs?: number;
}

export interface App {
  http: HttpServer;
  io: Server;
  rooms: RoomStore;
  sweep: () => void;
  close: () => Promise<void>;
}

const REACTION_WINDOW_MS = 1000;
const REACTIONS_PER_WINDOW = 2;

export function createApp(options: AppOptions): App {
  const now = options.now ?? Date.now;
  const rng = options.rng ?? Math.random;
  const rooms = new RoomStore();
  const reactionLog = new Map<string, number[]>();
  const revealTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const revealDelayMs = options.revealDelayMs ?? 900;

  const http = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain', 'access-control-allow-origin': '*' });
      res.end('ok');
      return;
    }
    res.writeHead(404);
    res.end();
  });
  const io = new Server(http, { cors: { origin: options.origin } });

  const stageRoom = (code: string) => `${code}:stage`;
  const operatorRoom = (code: string) => `${code}:operator`;
  const playerRoom = (code: string, playerId: string) => `${code}:player:${playerId}`;

  function requireRoom(code: unknown): Room {
    const room = typeof code === 'string' ? rooms.get(code) : undefined;
    if (!room) throw new GameError('ROOM_NOT_FOUND');
    return room;
  }

  function broadcast(room: Room): void {
    io.to(stageRoom(room.code)).emit('state', viewForStage(room));
    io.to(operatorRoom(room.code)).emit('state', viewForOperator(room));
    for (const player of room.players) {
      io.to(playerRoom(room.code, player.id)).emit('state', viewForPlayer(room, player.id));
    }
  }

  function closeRoom(room: Room): void {
    const targets = [stageRoom(room.code), operatorRoom(room.code), ...room.players.map((p) => playerRoom(room.code, p.id))];
    io.to(targets).emit('closed');
    io.in(targets).socketsLeave(targets);
    rooms.delete(room.code);
    clearTimeout(revealTimers.get(room.code));
    revealTimers.delete(room.code);
    for (const key of reactionLog.keys()) if (key.startsWith(`${room.code}:`)) reactionLog.delete(key);
  }

  /**
   * The last vote is broadcast as "all voted" first, so the last phone gets its throw animation and the
   * stage gets its ballot-box moment. Reveal follows after a short beat unless the operator acted first.
   */
  function scheduleAutoReveal(room: Room): void {
    const round = room.rounds.at(-1);
    if (revealTimers.has(room.code) || room.phase !== 'voting' || !round || !allVoted(round)) return;
    const timer = setTimeout(() => {
      revealTimers.delete(room.code);
      if (rooms.get(room.code) !== room) return;
      if (maybeAutoReveal(room, rng)) broadcast(room);
    }, revealDelayMs);
    revealTimers.set(room.code, timer);
  }

  function sweep(): void {
    for (const room of rooms.expired(now(), ROOM_TTL_MS)) closeRoom(room);
  }
  const sweepTimer = setInterval(sweep, options.sweepMs ?? 60_000);
  sweepTimer.unref();

  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData;

    const on = (event: string, handler: (payload: Payload) => Payload | void) => {
      socket.on(event, (payload: unknown, ack?: unknown) => {
        const reply = typeof ack === 'function' ? (ack as (res: AckResponse) => void) : () => undefined;
        try {
          const extra = handler(payload && typeof payload === 'object' ? (payload as Payload) : {});
          reply({ ok: true, ...(extra ?? {}) });
        } catch (error) {
          if (error instanceof GameError) {
            reply({ ok: false, code: error.code });
          } else {
            console.error(`handler failed: ${event}`, error);
            reply({ ok: false, code: 'INTERNAL' });
          }
        }
      });
    };

    const attach = (code: string, role: Role, playerId?: string) => {
      for (const joined of socket.rooms) if (joined !== socket.id) socket.leave(joined);
      data.code = code;
      data.role = role;
      data.playerId = playerId;
      if (role === 'stage') socket.join(stageRoom(code));
      else if (role === 'operator') socket.join(operatorRoom(code));
      else if (playerId) socket.join(playerRoom(code, playerId));
    };

    const asOperator = (): Room => {
      if (data.role !== 'operator' || !data.code) throw new GameError('UNAUTHORIZED');
      return requireRoom(data.code);
    };

    const asPlayer = (): { room: Room; playerId: string } => {
      if (data.role !== 'player' || !data.code || !data.playerId) throw new GameError('UNAUTHORIZED');
      return { room: requireRoom(data.code), playerId: data.playerId };
    };

    const operatorAction = (event: string, action: (room: Room, payload: Payload) => void) =>
      on(event, (payload) => {
        const room = asOperator();
        action(room, payload);
        broadcast(room);
      });

    on('room:create', () => {
      const room = createRoom(rooms.newCode(), randomUUID(), now());
      rooms.add(room);
      attach(room.code, 'operator');
      broadcast(room);
      return { code: room.code, operatorToken: room.operatorToken };
    });

    on('op:auth', ({ code, token }) => {
      const room = requireRoom(code);
      if (token !== room.operatorToken) throw new GameError('UNAUTHORIZED');
      attach(room.code, 'operator');
      broadcast(room);
    });

    on('stage:watch', ({ code }) => {
      const room = requireRoom(code);
      attach(room.code, 'stage');
      socket.emit('state', viewForStage(room));
    });

    on('player:join', ({ code, name }) => {
      const room = requireRoom(code);
      const player = joinRoom(room, String(name ?? ''), randomUUID(), randomUUID());
      attach(room.code, 'player', player.id);
      broadcast(room);
      return { playerId: player.id, token: player.token };
    });

    on('player:resume', ({ code, playerId, token }) => {
      const room = requireRoom(code);
      const player = findPlayer(room, String(playerId ?? ''));
      if (player.token !== token) throw new GameError('UNAUTHORIZED');
      player.connected = true;
      attach(room.code, 'player', player.id);
      broadcast(room);
    });

    on('player:vote', ({ targetId, reason, prediction }) => {
      const { room, playerId } = asPlayer();
      submitVote(
        room,
        playerId,
        { targetId: String(targetId ?? ''), reason: typeof reason === 'string' ? reason : '', prediction: Number(prediction) },
        randomUUID(),
        rng,
      );
      broadcast(room);
      scheduleAutoReveal(room);
    });

    on('player:react', ({ kind }) => {
      const { room, playerId } = asPlayer();
      if (room.phase !== 'reveal') throw new GameError('WRONG_PHASE');
      if (!REACTION_KINDS.includes(kind as ReactionKind)) throw new GameError('INVALID_REACTION');
      const key = `${room.code}:${playerId}`;
      const t = now();
      const recent = (reactionLog.get(key) ?? []).filter((at) => t - at < REACTION_WINDOW_MS);
      if (recent.length >= REACTIONS_PER_WINDOW) throw new GameError('RATE_LIMITED');
      recent.push(t);
      reactionLog.set(key, recent);
      io.to(stageRoom(room.code)).emit('reaction', { kind });
      if (kind === 'unfair') {
        try {
          protest(room, playerId);
          broadcast(room);
        } catch (error) {
          if (!(error instanceof GameError)) throw error;
        }
      }
    });

    operatorAction('op:start', (room) => startGame(room, now()));
    operatorAction('op:reveal', (room) => reveal(room, rng));
    operatorAction('op:showReasons', (room) => showReasons(room, rng));
    operatorAction('op:hideReason', (room, { reasonId }) => hideReason(room, String(reasonId ?? '')));
    operatorAction('op:next', (room) => nextRound(room));
    operatorAction('op:skip', (room) => skipQuestion(room));
    operatorAction('op:finish', (room) => finish(room, now()));
    operatorAction('op:rename', (room, { playerId, name }) => renamePlayer(room, String(playerId ?? ''), String(name ?? '')));
    operatorAction('op:admit', (room, { playerId }) => admitPlayer(room, String(playerId ?? '')));
    operatorAction('op:remove', (room, { playerId }) => {
      removePlayer(room, String(playerId ?? ''));
      scheduleAutoReveal(room);
    });
    on('op:end', () => {
      closeRoom(asOperator());
    });

    socket.on('disconnect', () => {
      if (data.role !== 'player' || !data.code || !data.playerId) return;
      const room = rooms.get(data.code);
      if (!room) return;
      const name = playerRoom(room.code, data.playerId);
      if ((io.sockets.adapter.rooms.get(name)?.size ?? 0) > 0) return; // another tab is still open
      const player = room.players.find((p) => p.id === data.playerId);
      if (!player) return;
      player.connected = false;
      broadcast(room);
    });
  });

  return {
    http,
    io,
    rooms,
    sweep,
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(sweepTimer);
        void io.close(() => resolve());
      }),
  };
}
```

`apps/server/src/index.ts`:

```ts
import { createApp } from './app';

const port = Number(process.env.PORT ?? 4000);
const configured = (process.env.WEB_ORIGIN ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (configured.length === 0) console.warn('WEB_ORIGIN is not set: allowing any origin (local development only).');

const { http } = createApp({ origin: configured.length > 0 ? configured : true });
http.listen(port, () => console.log(`realtime server listening on :${port}`));
```

- [ ] **Step 5: 테스트 통과와 빌드 확인**

Run: `npm test -w @ojt/server && npm run typecheck -w @ojt/server && npm run build -w @ojt/server`
Expected: PASS (10 tests), 타입 오류 없음, `apps/server/dist/index.js` 생성.

Run: `npm run start -w @ojt/server` 후 다른 터미널에서 `curl http://localhost:4000/health`
Expected: `ok`. 확인 후 서버 종료.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(server): socket.io realtime server" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: 웹 골격, 공통 라이브러리, 첫 화면

**Files:**
- Create: `apps/web` (create-next-app)
- Modify: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/app/page.tsx`
- Create: `apps/web/.env.example`
- Create: `apps/web/src/lib/socket.ts`, `storage.ts`, `messages.ts`, `format.ts`, `useRoomState.ts`, `health.ts`, `reactions.ts`
- Create: `apps/web/src/components/ui/Button.tsx`, `Notice.tsx`, `MotionProvider.tsx`
- Test: `apps/web/src/lib/format.test.ts`

**Interfaces:**
- Consumes: Task 6 프로토콜, `@ojt/game` 타입
- Produces:
  - `getSocket(): Socket`, `call<T>(event, payload?): Promise<AckResult<T>>`, `type AckResult<T> = ({ ok: true } & T) | { ok: false; code: string }`, `SOCKET_URL`
  - `readJson<T>(key): T | null`, `writeJson(key, value)`, `removeKey(key)`
  - `messageFor(code): string`
  - `formatElapsed(ms): string`, `textLength(value): number`
  - `useRoomState<V>(key, attach): { view: V | null; closed: boolean; error: string | null; setError }`
  - `useHealthPing(intervalMs?)`
  - `REACTION_LABELS: Record<ReactionKind, string>`
  - `<Button variant? />`, `<Notice title? />`, `<MotionProvider />`
  - localStorage 키: 운영자 `op:<code>` → `{ token }`, 참가자 `player:<code>` → `{ playerId, token }`

- [ ] **Step 1: Next.js 앱 생성과 의존성 설치**

```bash
cd /c/projects/ojt-web-game
npm exec --yes -- create-next-app@latest apps/web --ts --tailwind --app --src-dir --import-alias "@/*" --use-npm --skip-install --disable-git --yes
```

`apps/web/package.json`에서 `"name"`을 `"@ojt/web"`로 바꾸고, `scripts`에 `"test": "vitest run"`과 `"typecheck": "tsc --noEmit"`을 추가하고, `dependencies`에 `"@ojt/game": "*"`를 추가한다. 그다음:

```bash
npm install
npm install socket.io-client motion qrcode.react -w @ojt/web
```

`apps/web/next.config.ts` 전체:

```ts
import path from 'node:path';
import type { NextConfig } from 'next';

const root = path.resolve(process.cwd(), '../..');

const nextConfig: NextConfig = {
  transpilePackages: ['@ojt/game'],
  outputFileTracingRoot: root,
  turbopack: { root },
  // The dev server blocks dev resources for hosts other than localhost. Phones on the LAN need this.
  allowedDevOrigins: (process.env.DEV_LAN_HOSTS ?? '127.0.0.1').split(',').map((h) => h.trim()).filter(Boolean),
};

export default nextConfig;
```

`apps/web/.env.example`:

```
# 실시간 서버 주소. 로컬은 http://localhost:4000, 폰으로 테스트할 때는 http://<노트북 LAN IP>:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
# 최종 화면 구석에 표시할 팀 크레딧. 비우면 표시하지 않는다.
NEXT_PUBLIC_TEAM_CREDIT=Made by 정보시스템팀 류명효 대리
# 개발 서버를 폰(LAN)에서 열 때 허용할 호스트. 쉼표로 구분. 예: 127.0.0.1,192.168.0.23
DEV_LAN_HOSTS=127.0.0.1
```

`apps/web/.env.local`을 `.env.example`을 복사해 만든다 (커밋하지 않음).

- [ ] **Step 2: 폰트 파일을 프로젝트에 넣기**

폰트는 외부 CDN에서 불러오지 않고 Vercel에서 같은 주소로 제공한다. 교육장 사내망에서 CDN이 막히면 무대 화면이 조용히 시스템 폰트로 바뀌기 때문이다. 사내망의 TLS 검사 때문에 이 PC의 curl은 `--ssl-no-revoke`가 필요하다.

```bash
mkdir -p apps/web/public/fonts
for f in noonfonts_2001@1.1/GmarketSansLight.woff noonfonts_2001@1.1/GmarketSansMedium.woff noonfonts_2001@1.1/GmarketSansBold.woff noonfonts_2105_2@1.0/Cafe24Ssurround.woff; do
  curl --ssl-no-revoke -fsS -o "apps/web/public/fonts/$(basename "$f")" "https://cdn.jsdelivr.net/gh/projectnoonnu/$f"
done
ls -l apps/web/public/fonts
```

Expected: 파일 4개, 각 400KB 이상 (2026-10-06 확인 기준: Light 559,744 / Medium 610,480 / Bold 629,668 / Cafe24Ssurround 407,568 바이트). 두 폰트 모두 무료 배포이며 재배포가 아닌 웹 임베딩 용도로만 쓴다.

- [ ] **Step 3: 테마와 레이아웃**

`apps/web/src/app/globals.css` 전체:

```css
@import "tailwindcss";

@font-face {
  font-family: "GmarketSans";
  src: url("/fonts/GmarketSansLight.woff") format("woff");
  font-weight: 300;
  font-display: swap;
}
@font-face {
  font-family: "GmarketSans";
  src: url("/fonts/GmarketSansMedium.woff") format("woff");
  font-weight: 500;
  font-display: swap;
}
@font-face {
  font-family: "GmarketSans";
  src: url("/fonts/GmarketSansBold.woff") format("woff");
  font-weight: 700;
  font-display: swap;
}
@font-face {
  font-family: "Cafe24Ssurround";
  src: url("/fonts/Cafe24Ssurround.woff") format("woff");
  font-weight: 700;
  font-display: swap;
}

@theme {
  --color-brand-deep: rgb(0 108 183);
  --color-brand-mid: rgb(0 123 195);
  --color-brand-sky: rgb(0 172 230);
  --color-ink: #1f2328;
  --color-muted: #5f6672;
  --color-paper: #f7f8fa;
  --font-sans: "GmarketSans", system-ui, sans-serif;
  /* Casual display face for big text only. User-typed names and reasons always use --font-sans. */
  --font-display: "Cafe24Ssurround", "GmarketSans", sans-serif;
}

html,
body {
  background: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-sans);
  -webkit-tap-highlight-color: transparent;
}

/* One visible focus style for every control (keyboard users, projector laptop). */
:focus-visible {
  outline: 3px solid var(--color-brand-deep);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

`apps/web/src/components/ui/MotionProvider.tsx`:

```tsx
'use client';

import { MotionConfig } from 'motion/react';

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
```

`apps/web/src/app/layout.tsx` 전체:

```tsx
import type { Metadata, Viewport } from 'next';
import { MotionProvider } from '@/components/ui/MotionProvider';
import './globals.css';

export const metadata: Metadata = {
  title: '누가 가장 그럴까?',
  description: 'OJT 아이스브레이킹 게임',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f7f8fa',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh antialiased">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: 실패하는 테스트 작성 (순수 함수)**

`apps/web/src/lib/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatElapsed, textLength } from './format';

describe('formatElapsed', () => {
  it('formats minutes and seconds in Korean', () => {
    expect(formatElapsed(572_000)).toBe('9분 32초');
    expect(formatElapsed(45_400)).toBe('45초');
    expect(formatElapsed(-5)).toBe('0초');
  });
});

describe('textLength', () => {
  it('counts characters the same way the server does', () => {
    expect(textLength('  민수 ')).toBe(2);
    expect(textLength('여섯글자이름')).toBe(6);
  });
});
```

Run: `npm test -w @ojt/web`
Expected: FAIL: `./format` 없음.

- [ ] **Step 5: 공통 라이브러리 구현**

`apps/web/src/lib/format.ts`:

```ts
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;
}

/** Matches the server: trimmed, counted by code point. */
export function textLength(value: string): number {
  return Array.from(value.trim()).length;
}
```

`apps/web/src/lib/socket.ts`:

```ts
'use client';

import { io, type Socket } from 'socket.io-client';

export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

/**
 * One connection per tab. Socket.IO reconnects by itself; screens re-attach on every 'connect'.
 * Default transports on purpose: long-polling first, then upgrade, so a proxy that blocks WebSocket still works.
 */
export function getSocket(): Socket {
  if (!socket) socket = io(SOCKET_URL);
  return socket;
}

export type AckResult<T extends object = object> = ({ ok: true } & T) | { ok: false; code: string };

export function call<T extends object = object>(event: string, payload: object = {}): Promise<AckResult<T>> {
  return new Promise((resolve) => {
    getSocket()
      .timeout(5000)
      .emit(event, payload, (err: Error | null, res: AckResult<T>) => resolve(err ? { ok: false, code: 'TIMEOUT' } : res));
  });
}
```

`apps/web/src/lib/storage.ts`:

```ts
/** localStorage can be missing or throw (private mode, blocked storage). Never let it break a screen. */
export function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Without storage the session still works until the tab is closed.
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
```

`apps/web/src/lib/messages.ts`:

```ts
const MESSAGES: Record<string, string> = {
  NAME_INVALID: '이름은 1~6자로 입력해 주세요.',
  NAME_TAKEN: '이미 있는 이름이에요.',
  ROOM_FULL: '방이 가득 찼어요.',
  ROOM_NOT_FOUND: '방을 찾을 수 없어요. QR을 다시 찍어 주세요.',
  UNAUTHORIZED: '권한이 없어요.',
  WRONG_PHASE: '지금은 할 수 없는 동작이에요.',
  NOT_ENOUGH_PLAYERS: '3명 이상 모여야 시작할 수 있어요.',
  ALREADY_VOTED: '이미 투표했어요.',
  NOT_ELIGIBLE: '이번 문제에는 참여할 수 없어요.',
  INVALID_TARGET: '고를 수 없는 사람이에요.',
  INVALID_PREDICTION: '예상 득표를 다시 골라 주세요.',
  REASON_TOO_LONG: '이유는 20자까지 쓸 수 있어요.',
  NO_VOTES: '아직 투표가 없어요.',
  NO_SPARE: '남은 예비 문제가 없어요.',
  LAST_ROUND: '마지막 문제예요.',
  TIMEOUT: '서버 응답이 늦어요. 잠시 후 다시 시도해 주세요.',
};

export function messageFor(code: string): string {
  return MESSAGES[code] ?? '문제가 생겼어요. 다시 시도해 주세요.';
}
```

`apps/web/src/lib/useRoomState.ts`:

```ts
'use client';

import { useEffect, useState } from 'react';
import { getSocket, type AckResult } from './socket';

/**
 * Subscribes to the role-specific 'state' stream. `attach` (auth / watch / resume) runs on every
 * (re)connect, which is what brings a phone back after it sleeps. Change `key` to re-attach.
 */
export function useRoomState<V>(key: string, attach: (() => Promise<AckResult<object>>) | null) {
  const [view, setView] = useState<V | null>(null);
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attach) return;
    const socket = getSocket();
    const onState = (next: V) => {
      setView(next);
      setError(null);
    };
    const onClosed = () => setClosed(true);
    const onConnect = () => {
      void attach().then((res) => {
        if (!res.ok) setError(res.code);
      });
    };
    socket.on('state', onState);
    socket.on('closed', onClosed);
    socket.on('connect', onConnect);
    if (socket.connected) onConnect();
    return () => {
      socket.off('state', onState);
      socket.off('closed', onClosed);
      socket.off('connect', onConnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures everything attach depends on
  }, [key]);

  return { view, closed, error, setError };
}
```

`apps/web/src/lib/health.ts`:

```ts
'use client';

import { useEffect } from 'react';
import { SOCKET_URL } from './socket';

/** Render's free plan sleeps after idle time; the stage screen keeps it awake while the game is open. */
export function useHealthPing(intervalMs = 4 * 60 * 1000): void {
  useEffect(() => {
    const ping = () => {
      void fetch(`${SOCKET_URL}/health`).catch(() => undefined);
    };
    ping();
    const timer = setInterval(ping, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
}
```

`apps/web/src/lib/reactions.ts`:

```ts
import type { ReactionKind } from '@ojt/game';

export const REACTION_LABELS: Record<ReactionKind, string> = {
  lol: 'ㅋㅋㅋ',
  agree: '인정',
  unfair: '억울',
};
```

`apps/web/src/components/ui/Button.tsx`:

```tsx
'use client';

import { motion, type HTMLMotionProps } from 'motion/react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-deep text-white active:bg-brand-mid disabled:bg-gray-300 disabled:text-gray-500',
  secondary: 'border-2 border-brand-deep bg-white text-brand-deep disabled:opacity-40',
  ghost: 'bg-transparent text-muted underline underline-offset-4',
  danger: 'border-2 border-red-200 bg-white text-red-600 disabled:opacity-40',
};

export function Button({ variant = 'primary', className = '', ...props }: HTMLMotionProps<'button'> & { variant?: Variant }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      className={`min-h-12 w-full rounded-2xl px-5 text-lg font-bold transition-colors ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
```

`apps/web/src/components/ui/Notice.tsx`:

```tsx
export function Notice({ title, children }: { title?: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      {title && <h1 className="font-display text-3xl text-brand-deep">{title}</h1>}
      {children && <p className="text-lg text-muted">{children}</p>}
    </div>
  );
}
```

- [ ] **Step 6: 첫 화면 (운영자 방 만들기 / 무대 화면 열기)**

`apps/web/src/app/page.tsx` 전체:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { messageFor } from '@/lib/messages';
import { call } from '@/lib/socket';
import { writeJson } from '@/lib/storage';

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createRoom() {
    setBusy(true);
    setError(null);
    const res = await call<{ code: string; operatorToken: string }>('room:create');
    setBusy(false);
    if (!res.ok) {
      setError(messageFor(res.code));
      return;
    }
    writeJson(`op:${res.code}`, { token: res.operatorToken });
    router.push(`/op/${res.code}`);
  }

  function openStage(event: React.FormEvent) {
    event.preventDefault();
    if (/^\d{4}$/.test(code)) router.push(`/stage/${code}`);
    else setError('방 코드는 숫자 4자리예요.');
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-10 p-6">
      <h1 className="font-display text-4xl text-brand-deep">누가 가장 그럴까?</h1>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">운영자 (본인 폰)</h2>
        <Button onClick={createRoom} disabled={busy}>방 만들기</Button>
      </section>
      <form onSubmit={openStage} className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">무대 화면 (프로젝터 노트북)</h2>
        <input
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="방 코드 4자리"
          aria-label="방 코드"
          className="min-h-14 rounded-2xl border-2 border-gray-200 bg-white px-4 text-2xl tracking-widest focus:border-brand-deep"
        />
        <Button type="submit" variant="secondary">무대 화면 열기</Button>
      </form>
      {error && <p role="alert" className="text-red-600">{error}</p>}
    </main>
  );
}
```

- [ ] **Step 7: 테스트, 타입 검사, 빌드**

Run: `npm test -w @ojt/web && npm run typecheck -w @ojt/web && npm run build -w @ojt/web`
Expected: 테스트 PASS, 타입 오류 없음, 빌드 성공.

- [ ] **Step 8: 수동 확인**

터미널 1: `npm run dev:server`, 터미널 2: `npm run dev:web`.
vibescraper MCP로 사용자가 활성화한 Chrome 탭에서 `http://localhost:3000`을 연다.
Expected: 둥근 써라운드체 제목과 지마켓 산스 본문이 보인다. "방 만들기"를 누르면 `/op/<4자리>`로 이동한다 (이 화면은 Task 8에서 만든다. 지금은 404여도 된다).

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "feat(web): next app shell, shared client libs and home" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: 운영자 화면

**Files:**
- Create: `apps/web/src/app/op/[code]/page.tsx`
- Create: `apps/web/src/components/operator/OperatorScreen.tsx`, `apps/web/src/components/operator/PlayerAdmin.tsx`

**Interfaces:**
- Consumes: Task 7의 `call`, `useRoomState`, `readJson`, `removeKey`, `messageFor`, `Button`, `Notice`; `@ojt/game`의 `OperatorView`, `PublicPlayer`
- Produces: `/op/<code>` 화면. 이 폰에 저장된 `op:<code>` 토큰으로 `op:auth`.

- [ ] **Step 1: 페이지와 참가자 관리 컴포넌트**

`apps/web/src/app/op/[code]/page.tsx`:

```tsx
import { OperatorScreen } from '@/components/operator/OperatorScreen';

export default async function OperatorPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <OperatorScreen code={code} />;
}
```

`apps/web/src/components/operator/PlayerAdmin.tsx`:

```tsx
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
```

- [ ] **Step 2: 운영자 화면**

`apps/web/src/components/operator/OperatorScreen.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { OperatorView } from '@ojt/game';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { messageFor } from '@/lib/messages';
import { call } from '@/lib/socket';
import { readJson, removeKey, writeJson } from '@/lib/storage';
import { useRoomState } from '@/lib/useRoomState';
import { PlayerAdmin } from './PlayerAdmin';

const PHASE_LABEL = { lobby: '입장 대기', voting: '투표 중', reveal: '결과', final: '최종 결과' } as const;

export function OperatorScreen({ code }: { code: string }) {
  const storageKey = `op:${code}`;
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    // A recovery link (/op/<code>#<token>) moves operator rights to this device.
    const fromLink = window.location.hash.slice(1);
    if (fromLink) {
      writeJson(storageKey, { token: fromLink });
      window.history.replaceState(null, '', window.location.pathname);
    }
    setToken(fromLink || readJson<{ token: string }>(storageKey)?.token || null);
  }, [storageKey]);
  const [copied, setCopied] = useState(false);

  const { view, closed, error, setError } = useRoomState<OperatorView>(
    `${storageKey}:${token ?? ''}`,
    token ? () => call('op:auth', { code, token }) : null,
  );
  const [busy, setBusy] = useState(false);

  async function act(event: string, payload: object = {}, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    const res = await call(event, payload);
    setBusy(false);
    setError(res.ok ? null : res.code);
    if (res.ok && event === 'op:end') removeKey(storageKey);
  }

  if (token === undefined) return <Notice>운영자 권한을 확인하는 중</Notice>;
  if (token === null) return <Notice title="운영자 권한 없음">방을 만든 폰에서 열거나, 그 폰에서 복사한 운영자 링크로 열어 주세요.</Notice>;
  if (closed) return <Notice title="게임 종료">방 데이터가 삭제됐습니다.</Notice>;
  if (!view) return <Notice>{error ? messageFor(error) : '서버에 연결하는 중'}</Notice>;

  const { round, result } = view;
  const active = view.players.filter((p) => p.status === 'active');
  const pending = view.players.filter((p) => p.status === 'pending');
  const nameOf = (id: string) => view.players.find((p) => p.id === id)?.name ?? '';
  const playing = view.phase === 'voting' || view.phase === 'reveal';
  const recoveryLink = `${window.location.origin}/op/${view.code}#${token}`;

  async function copyRecoveryLink() {
    try {
      await navigator.clipboard.writeText(recoveryLink);
      setCopied(true);
    } catch {
      setCopied(false);
      window.prompt('아래 링크를 길게 눌러 복사해 주세요', recoveryLink);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4 pb-64">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">방 {view.code}</h1>
        <span className="rounded-full bg-brand-sky/15 px-3 py-1 text-sm font-bold text-brand-deep">
          {PHASE_LABEL[view.phase]}
          {round ? ` · Q${round.number}/${round.total}` : ''}
        </span>
      </header>

      {view.phase === 'lobby' && (
        <p className="rounded-2xl bg-white p-4 text-muted">
          노트북에서 이 사이트 첫 화면을 열고 방 코드 <b className="text-ink">{view.code}</b>를 입력하면 무대 화면이 열립니다.
        </p>
      )}

      {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-red-700">{messageFor(error)}</p>}

      {playing && active.length < 3 && (
        <p role="alert" className="rounded-2xl bg-amber-50 p-3 text-amber-800">
          참가자가 {active.length}명뿐이에요. 투표가 의미 없어지니 조기 종료를 권장합니다.
        </p>
      )}

      {pending.length > 0 && (
        <section className="rounded-2xl bg-white p-4">
          <h2 className="mb-2 font-bold">입장 대기</h2>
          <ul className="flex flex-col gap-2">
            {pending.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <span className="flex-1 text-lg">{p.name}</span>
                <Button className="w-auto" variant="secondary" disabled={busy} onClick={() => act('op:admit', { playerId: p.id })}>
                  입장 허용
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {round && (
        <section className="rounded-2xl bg-white p-4">
          <p className="text-sm text-muted">현재 질문</p>
          <p className="mt-1 text-lg font-bold">{round.question}</p>
        </section>
      )}

      {view.phase === 'voting' && round && (
        <section className="rounded-2xl bg-white p-4">
          <h2 className="mb-2 font-bold">투표 {round.votedIds.length} / {round.eligibleIds.length}</h2>
          <ul className="grid grid-cols-2 gap-2">
            {round.eligibleIds.map((id) => (
              <li key={id} className={round.votedIds.includes(id) ? 'font-bold text-brand-deep' : 'text-muted'}>
                {round.votedIds.includes(id) ? '✓ ' : '· '}
                {nameOf(id)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.phase === 'reveal' && result && (
        <section className="rounded-2xl bg-white p-4">
          <h2 className="mb-2 font-bold">결과 · {result.comment}</h2>
          <ul className="mb-4">
            {[...result.counts].sort((a, b) => b.votes - a.votes).map((c) => (
              <li key={c.playerId} className={result.topIds.includes(c.playerId) ? 'font-bold text-brand-deep' : ''}>
                {nameOf(c.playerId)} {c.votes}표
              </li>
            ))}
          </ul>
          <h3 className="mb-1 font-bold">1위에게 달린 이유 (공개 전 확인)</h3>
          {view.reasons.length === 0 && <p className="text-muted">이번 1위에게 달린 이유가 없어요.</p>}
          <ul className="flex flex-col gap-2">
            {view.reasons.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <span className={`flex-1 ${r.hidden ? 'text-muted line-through' : ''}`}>
                  {r.targetName}: {r.text}
                </span>
                <button
                  type="button"
                  className="min-h-12 px-3 text-red-600 disabled:text-muted"
                  disabled={busy || r.hidden}
                  onClick={() => act('op:hideReason', { reasonId: r.id })}
                >
                  {r.hidden ? '숨김' : '숨기기'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.phase !== 'final' && (
        <details className="rounded-2xl bg-white p-4">
          <summary className="min-h-12 cursor-pointer content-center font-bold">이 폰을 쓸 수 없게 되면</summary>
          <p className="mt-2 text-muted">
            운영자 링크를 다른 기기에서 열면 그 기기가 운영자가 됩니다. 무대 화면이나 단체 채팅방에는 올리지 마세요.
          </p>
          <Button className="mt-3" variant="secondary" onClick={copyRecoveryLink}>
            {copied ? '운영자 링크를 복사했어요' : '운영자 링크 복사'}
          </Button>
        </details>
      )}

      {view.phase === 'final' && view.titles && (
        <section className="rounded-2xl bg-white p-4">
          <h2 className="mb-2 font-bold">최종 칭호</h2>
          <ul>
            {view.titles.map((t) => (
              <li key={t.playerId}>
                {t.name}: {t.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.phase !== 'final' && (
        <PlayerAdmin
          players={active}
          disabled={busy}
          onRename={(playerId, name) => act('op:rename', { playerId, name })}
          onRemove={(playerId, name) => act('op:remove', { playerId }, `${name} 님을 참가 목록에서 제외할까요?`)}
        />
      )}

      <footer className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-4">
        <div className="mx-auto flex max-w-md flex-col gap-2">
          {view.phase === 'lobby' && (
            <>
              <p className="text-center text-sm text-muted">{active.length}명 입장 · 최소 3명</p>
              <Button disabled={busy || active.length < 3} onClick={() => act('op:start')}>시작</Button>
            </>
          )}
          {view.phase === 'voting' && round && (
            <>
              <Button disabled={busy || round.votedIds.length === 0} onClick={() => act('op:reveal')}>결과 공개</Button>
              <Button
                variant="secondary"
                disabled={busy || view.spareLeft === 0}
                onClick={() => act('op:skip', {}, '이 문제를 예비 문제로 바꿀까요? 이미 들어온 투표는 사라집니다.')}
              >
                이 문제 건너뛰기 (예비 {view.spareLeft})
              </Button>
            </>
          )}
          {view.phase === 'reveal' && result && (
            <>
              <Button
                variant="secondary"
                disabled={busy || result.reasons !== null || view.reasons.every((r) => r.hidden)}
                onClick={() => act('op:showReasons')}
              >
                {result.reasons !== null ? '이유 공개됨' : '이유 보기'}
              </Button>
              {view.isLastRound ? (
                <Button disabled={busy} onClick={() => act('op:finish')}>최종 결과 보기</Button>
              ) : (
                <Button disabled={busy} onClick={() => act('op:next')}>다음 문제</Button>
              )}
            </>
          )}
          {playing && (
            <Button variant="danger" disabled={busy} onClick={() => act('op:finish', {}, '지금까지의 결과로 최종 화면으로 갈까요?')}>
              조기 종료
            </Button>
          )}
          {view.phase === 'final' && (
            <Button variant="danger" disabled={busy} onClick={() => act('op:end', {}, '게임을 종료하고 방 데이터를 삭제할까요?')}>
              게임 종료
            </Button>
          )}
        </div>
      </footer>
    </main>
  );
}
```

- [ ] **Step 3: 타입 검사와 빌드**

Run: `npm run typecheck -w @ojt/web && npm run build -w @ojt/web`
Expected: 오류 없음.

- [ ] **Step 4: 수동 확인**

`npm run dev:server`, `npm run dev:web` 실행. vibescraper MCP로 활성 Chrome 탭에서 `http://localhost:3000` → "방 만들기".
Expected:
- `/op/<코드>`로 이동하고 "방 <코드>", "입장 대기", 참가자 0명, 비활성 "시작" 버튼이 보인다.
- 새로고침해도 같은 화면이 다시 나온다 (토큰 복구).
- 다른 브라우저 프로필(또는 `http://127.0.0.1:3000/op/<코드>`)에서 열면 "운영자 권한 없음"이 나온다.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(web): operator screen" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: 참가자 화면

**Files:**
- Create: `apps/web/src/app/p/[code]/page.tsx`
- Create: `apps/web/src/components/player/PlayerScreen.tsx`, `JoinForm.tsx`, `VoteFlow.tsx`, `ReactionPad.tsx`

**Interfaces:**
- Consumes: Task 7 공통 라이브러리; `@ojt/game`의 `PlayerView`, `PlayerRoundInfo`, `ReactionKind`, `NAME_MAX`, `REASON_MAX`
- Produces: `/p/<code>` 화면 (QR이 가리키는 주소). 참가 정보는 `player:<code>`에 저장하고 재연결마다 `player:resume`.

- [ ] **Step 1: 페이지와 입장 폼**

`apps/web/src/app/p/[code]/page.tsx`:

```tsx
import { PlayerScreen } from '@/components/player/PlayerScreen';

export default async function PlayerPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PlayerScreen code={code} />;
}
```

`apps/web/src/components/player/JoinForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { NAME_MAX } from '@ojt/game';
import { Button } from '@/components/ui/Button';
import { textLength } from '@/lib/format';
import { messageFor } from '@/lib/messages';
import { call } from '@/lib/socket';

export interface PlayerCreds { playerId: string; token: string }

export function JoinForm({ code, onJoined }: { code: string; onJoined: (creds: PlayerCreds) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const length = textLength(name);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const res = await call<PlayerCreds>('player:join', { code, name });
    setBusy(false);
    if (!res.ok) {
      setError(messageFor(res.code));
      return;
    }
    onJoined({ playerId: res.playerId, token: res.token });
  }

  return (
    <form onSubmit={submit} className="flex min-h-dvh flex-col gap-4 p-5">
      <div className="flex flex-1 flex-col justify-center gap-4">
        <h1 className="font-display text-4xl text-brand-deep">누가 가장 그럴까?</h1>
        <label htmlFor="name" className="text-lg font-bold">이름을 입력해 주세요</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          className="min-h-16 rounded-2xl border-2 border-gray-200 bg-white px-4 text-2xl focus:border-brand-deep"
        />
        <p className={`text-right text-sm ${length > NAME_MAX ? 'text-red-600' : 'text-muted'}`}>{length} / {NAME_MAX}</p>
        {error && <p role="alert" className="text-red-600">{error}</p>}
      </div>
      <Button type="submit" disabled={busy || length < 1 || length > NAME_MAX}>입장</Button>
    </form>
  );
}
```

- [ ] **Step 2: 투표 흐름 (선택 → 이유 → 예상 득표)**

`apps/web/src/components/player/VoteFlow.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { REASON_MAX, type PlayerRoundInfo } from '@ojt/game';
import { Button } from '@/components/ui/Button';
import { textLength } from '@/lib/format';
import { messageFor } from '@/lib/messages';
import { call } from '@/lib/socket';

type Step = 'pick' | 'reason' | 'predict';

/** Keyed by round in the parent, so state resets per question. Its exit animation is the "throw": it flies up when the vote lands. */
export function VoteFlow({ round }: { round: PlayerRoundInfo }) {
  const [step, setStep] = useState<Step>('pick');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [prediction, setPrediction] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const target = round.candidates.find((c) => c.id === targetId);
  const reasonLength = textLength(reason);

  async function send() {
    if (!targetId || prediction === null) return;
    setSending(true);
    setError(null);
    const res = await call('player:vote', { targetId, reason, prediction });
    setSending(false);
    if (!res.ok) {
      setError(messageFor(res.code));
      return;
    }
    navigator.vibrate?.(30);
  }

  return (
    <motion.div
      className="flex min-h-dvh flex-col gap-5 p-5 pb-44"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ y: -900, opacity: 0, transition: { duration: 0.55, ease: 'easeIn' } }}
    >
      <p className="text-sm font-bold text-brand-deep">Q{round.number} / {round.total}</p>
      <h1 className="font-display text-2xl leading-snug">{round.question}</h1>

      {step === 'pick' && (
        <ul className="grid grid-cols-2 gap-3">
          {round.candidates.map((c) => {
            const selected = c.id === targetId;
            return (
              <li key={c.id}>
                <motion.button
                  type="button"
                  onClick={() => setTargetId(c.id)}
                  animate={{ scale: selected ? 1.05 : 1, y: selected ? -6 : 0, opacity: targetId && !selected ? 0.4 : 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className={`min-h-24 w-full rounded-2xl bg-white text-2xl font-bold shadow-sm ${selected ? 'ring-4 ring-brand-mid' : ''}`}
                  aria-pressed={selected}
                >
                  {c.name}
                </motion.button>
              </li>
            );
          })}
        </ul>
      )}

      {step === 'reason' && target && (
        <div className="flex flex-col gap-2">
          <label htmlFor="reason" className="text-lg font-bold">{target.name} 님을 고른 이유 (선택)</label>
          <input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 평소에도 뭔가 하나씩 빠뜨림"
            autoComplete="off"
            className="min-h-14 rounded-2xl border-2 border-gray-200 bg-white px-4 text-lg focus:border-brand-deep"
          />
          <p className={`text-right text-sm ${reasonLength > REASON_MAX ? 'text-red-600' : 'text-muted'}`}>
            {reasonLength} / {REASON_MAX}
          </p>
        </div>
      )}

      {step === 'predict' && (
        <div className="flex flex-col gap-3">
          <p className="text-lg font-bold">나는 몇 표 받을 것 같나요?</p>
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: round.maxPrediction + 1 }, (_, n) => (
              <motion.button
                key={n}
                type="button"
                onClick={() => setPrediction(n)}
                animate={prediction === n ? { scale: [1, 1.25, 1], y: [0, -10, 0] } : { scale: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className={`min-h-16 rounded-2xl text-3xl font-bold ${prediction === n ? 'bg-brand-deep text-white' : 'bg-white text-ink shadow-sm'}`}
                aria-pressed={prediction === n}
              >
                {n}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-red-600">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 flex flex-col gap-2 bg-paper p-5">
        {step === 'pick' && (
          <Button disabled={!targetId} onClick={() => setStep('reason')}>다음</Button>
        )}
        {step === 'reason' && (
          <>
            <Button disabled={reasonLength > REASON_MAX} onClick={() => setStep('predict')}>
              {reasonLength > 0 ? '다음' : '건너뛰기'}
            </Button>
            <Button variant="ghost" onClick={() => setStep('pick')}>뒤로</Button>
          </>
        )}
        {step === 'predict' && (
          <>
            <Button disabled={prediction === null || sending} onClick={send}>보내기</Button>
            <Button variant="ghost" onClick={() => setStep('reason')}>뒤로</Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 3: 반응 버튼과 화면 전환**

`apps/web/src/components/player/ReactionPad.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import type { ReactionKind } from '@ojt/game';
import { REACTION_LABELS } from '@/lib/reactions';
import { call } from '@/lib/socket';

export function ReactionPad({ isTop, hasProtested }: { isTop: boolean; hasProtested: boolean }) {
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
    <div className="flex min-h-dvh flex-col p-5">
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="font-display text-3xl text-brand-deep">앞 화면을 보세요</p>
        {isTop && <p className="text-muted">{hasProtested ? '억울함이 전달됐어요.' : '이번 문제 1위예요.'}</p>}
      </div>
      <div className="flex flex-col gap-3">
        {isTop && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => react('unfair')}
            className="min-h-28 rounded-3xl bg-brand-deep font-display text-5xl text-white"
          >
            {REACTION_LABELS.unfair}
          </motion.button>
        )}
        <div className={`grid gap-3 ${isTop ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {small.map((kind) => (
            <motion.button
              key={kind}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => react(kind)}
              className="min-h-24 rounded-3xl bg-white font-display text-3xl text-brand-deep shadow-sm"
            >
              {REACTION_LABELS[kind]}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

`apps/web/src/components/player/PlayerScreen.tsx`:

```tsx
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
```

- [ ] **Step 4: 타입 검사와 빌드**

Run: `npm run typecheck -w @ojt/web && npm run build -w @ojt/web`
Expected: 오류 없음.

- [ ] **Step 5: 수동 확인 (운영자 1 + 참가자 3)**

`npm run dev:server`, `npm run dev:web` 실행. 참가자마다 localStorage가 따로 있어야 하므로 출처(origin)를 다르게 연다: 운영자는 `http://localhost:3000`, 참가자는 `http://127.0.0.1:3000/p/<코드>`, Chrome 시크릿 창의 `http://localhost:3000/p/<코드>`, 그리고 `http://<노트북 LAN IP>:3000/p/<코드>` (실제 폰이면 `.env.local`의 `NEXT_PUBLIC_SOCKET_URL`을 `http://<LAN IP>:4000`으로, `DEV_LAN_HOSTS`를 `127.0.0.1,<LAN IP>`로 바꾸고 web을 재시작). 화면 확인은 vibescraper MCP로 사용자가 활성화한 탭에서 한다.
Expected:
- 이름 입력 후 "내 이름이 앞 화면에 떴어요". 같은 이름은 "이미 있는 이름이에요".
- 운영자 "시작" → 참가자 화면에 질문과 본인을 뺀 이름 카드.
- 카드 선택 → 다음 → 이유(비워두면 버튼이 "건너뛰기") → 0~2 숫자 → 보내기 → 화면이 위로 날아가고 "투표 완료".
- 투표 완료 상태에서 새로고침 → 다시 "투표 완료" (재접속 복구).
- 모두 투표 → "앞 화면을 보세요"와 반응 버튼. 1위 폰에는 큰 "억울" 버튼.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(web): player screens" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: 무대 화면 (프로젝터)

**Files:**
- Create: `apps/web/src/app/stage/[code]/page.tsx`
- Create: `apps/web/src/components/stage/StageScreen.tsx`, `StageLobby.tsx`, `Progress.tsx`, `StageVoting.tsx`, `StageResult.tsx`, `ReactionLayer.tsx`, `StageFinal.tsx`

**Interfaces:**
- Consumes: Task 7 공통 라이브러리, `useHealthPing`, `REACTION_LABELS`, `formatElapsed`; `@ojt/game`의 `StageView`, `ReactionKind`
- Produces: `/stage/<code>` 화면. 버튼이 하나도 없다. 1920x1080 전체화면 기준.

- [ ] **Step 1: 페이지, 컨테이너, 입장 대기 화면**

`apps/web/src/app/stage/[code]/page.tsx`:

```tsx
import { StageScreen } from '@/components/stage/StageScreen';

export default async function StagePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <StageScreen code={code} />;
}
```

`apps/web/src/components/stage/StageScreen.tsx`:

```tsx
'use client';

import type { StageView } from '@ojt/game';
import { Notice } from '@/components/ui/Notice';
import { useHealthPing } from '@/lib/health';
import { messageFor } from '@/lib/messages';
import { call } from '@/lib/socket';
import { useRoomState } from '@/lib/useRoomState';
import { ReactionLayer } from './ReactionLayer';
import { StageFinal } from './StageFinal';
import { StageLobby } from './StageLobby';
import { StageResult } from './StageResult';
import { StageVoting } from './StageVoting';

export function StageScreen({ code }: { code: string }) {
  const { view, closed, error } = useRoomState<StageView>(`stage:${code}`, () => call('stage:watch', { code }));
  useHealthPing();

  if (closed) return <Notice title="감사합니다">이제 교육을 시작합니다.</Notice>;
  if (error && !view) return <Notice>{messageFor(error)}</Notice>;
  if (!view) return <Notice>서버에 연결하는 중</Notice>;

  return (
    <main className="relative h-dvh overflow-hidden p-12">
      {view.phase === 'lobby' && <StageLobby view={view} />}
      {view.phase === 'voting' && <StageVoting view={view} />}
      {view.phase === 'reveal' && <StageResult view={view} />}
      {view.phase === 'final' && <StageFinal view={view} />}
      <ReactionLayer />
    </main>
  );
}
```

`apps/web/src/components/stage/StageLobby.tsx`:

```tsx
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
```

- [ ] **Step 2: 진행 표시와 투표 중 화면 (투표함)**

`apps/web/src/components/stage/Progress.tsx`:

```tsx
'use client';

import { motion } from 'motion/react';

export function Progress({ number, total }: { number: number; total: number }) {
  return (
    <div className="flex items-center gap-6">
      <span className="text-3xl font-bold text-brand-mid">Q{number} / {total}</span>
      <div className="flex flex-1 gap-2">
        {Array.from({ length: total }, (_, i) => (
          <motion.div
            key={i}
            className="h-3 flex-1 rounded-full"
            initial={false}
            animate={{ backgroundColor: i < number ? 'rgb(0, 108, 183)' : 'rgba(0, 172, 230, 0.2)' }}
            transition={{ duration: 0.4, delay: i === number - 1 ? 0.2 : 0 }}
          />
        ))}
      </div>
    </div>
  );
}
```

`apps/web/src/components/stage/StageVoting.tsx`:

```tsx
'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { StageView } from '@ojt/game';
import { Progress } from './Progress';

export function StageVoting({ view }: { view: StageView }) {
  const round = view.round;
  if (!round) return null;
  const byId = new Map(view.players.map((p) => [p.id, p]));
  const waiting = round.eligibleIds.filter((id) => !round.votedIds.includes(id));
  const ratio = round.eligibleIds.length ? round.votedIds.length / round.eligibleIds.length : 0;

  return (
    <div className="flex h-full flex-col gap-10">
      <Progress number={round.number} total={round.total} />
      <div style={{ perspective: 1200 }}>
        <AnimatePresence mode="wait">
          <motion.h2
            key={round.question}
            initial={{ rotateX: 90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: -90, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-6xl leading-tight"
          >
            {round.question}
          </motion.h2>
        </AnimatePresence>
      </div>
      <div className="mt-auto grid grid-cols-[1fr_auto] items-end gap-12">
        <ul className="flex flex-wrap gap-4">
          {waiting.map((id) => {
            const last = waiting.length === 1;
            const player = byId.get(id);
            return (
              <motion.li
                key={id}
                layoutId={`ballot-${id}`}
                animate={last ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={last ? { repeat: Infinity, duration: 1.2 } : { type: 'spring' }}
                className={`rounded-2xl bg-white px-7 py-4 text-4xl font-bold shadow-sm ${last ? 'ring-4 ring-brand-sky' : ''} ${player?.connected === false ? 'opacity-40' : ''}`}
              >
                {player?.name}
              </motion.li>
            );
          })}
        </ul>
        <div className="relative flex h-72 w-96 flex-col overflow-hidden rounded-3xl border-4 border-brand-deep bg-white">
          <motion.div
            className="absolute inset-x-0 bottom-0 bg-brand-sky/25"
            initial={false}
            animate={{ height: `${ratio * 100}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
          <ul className="relative flex flex-wrap content-start gap-2 p-4">
            {round.votedIds.map((id) => (
              <motion.li
                key={id}
                layoutId={`ballot-${id}`}
                className="rounded-xl bg-brand-deep px-3 py-1 text-xl font-bold text-white"
              >
                ✓ {byId.get(id)?.name}
              </motion.li>
            ))}
          </ul>
          <p className="relative mt-auto p-4 text-right text-3xl font-bold text-brand-deep">
            {round.votedIds.length} / {round.eligibleIds.length}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 결과 공개 연출**

공개 순서 (PRD 5절): 0초 질문 → 1초 막대 (1위는 0.6초 늦게, 더 길게) → 4초 1위 배지와 멘트 → 5.5초 예상 vs 실제. 이유는 운영자가 "이유 보기"를 눌러 `result.reasons`가 채워질 때 나타난다. 억울 배너는 `protestedIds`가 생기면 위에서 내려온다.

`apps/web/src/components/stage/StageResult.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { StageView } from '@ojt/game';

const STEP_TIMES_MS = [1000, 4000, 5500];

export function StageResult({ view }: { view: StageView }) {
  const { round, result } = view;
  const [step, setStep] = useState(0);
  const roundKey = round ? `${round.number}-${round.question}` : '';

  useEffect(() => {
    setStep(0);
    const timers = STEP_TIMES_MS.map((ms, i) => setTimeout(() => setStep(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [roundKey]);

  if (!round || !result) return null;
  const nameOf = (id: string) => view.players.find((p) => p.id === id)?.name ?? '';
  const max = Math.max(1, ...result.counts.map((c) => c.votes));
  const protesters = result.protestedIds.map(nameOf);

  return (
    <div className="flex h-full flex-col gap-8">
      <p className="text-2xl font-bold text-brand-mid">Q{round.number} / {round.total} 결과</p>
      <h2 className="font-display text-5xl leading-tight">{round.question}</h2>

      <ul className="flex flex-col gap-4">
        {result.counts.map(({ playerId, votes }) => {
          const top = result.topIds.includes(playerId);
          return (
            <li key={playerId} className={`grid grid-cols-[20rem_1fr_7rem] items-center gap-6 ${votes === 0 ? 'opacity-40' : ''}`}>
              <span className={`flex items-center gap-3 text-4xl ${top ? 'font-bold text-brand-deep' : ''}`}>
                {nameOf(playerId)}
                {top && step >= 2 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    className="rounded-full bg-brand-deep px-3 py-1 text-2xl text-white"
                  >
                    1위
                  </motion.span>
                )}
              </span>
              <div className="h-12 overflow-hidden rounded-full bg-white">
                <motion.div
                  className={`h-full rounded-full ${top ? 'bg-brand-deep' : 'bg-brand-sky'}`}
                  initial={{ width: 0 }}
                  animate={{ width: step >= 1 ? `${(votes / max) * 100}%` : 0 }}
                  transition={{ duration: top ? 1.4 : 0.9, delay: top ? 0.6 : 0, ease: 'easeOut' }}
                />
              </div>
              <span className="text-right text-4xl font-bold">{step >= 1 ? `${votes}표` : ''}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-4">
        <AnimatePresence>
          {step >= 2 && (
            <motion.p key="comment" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-5xl text-brand-deep">
              {result.comment}
            </motion.p>
          )}
          {step >= 3 && result.prediction && (
            <motion.p key="prediction" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl">
              {nameOf(result.prediction.playerId)}: 예상 {result.prediction.predicted}표 → 실제 {result.prediction.actual}표{' '}
              <span className="font-bold text-brand-mid">{result.prediction.comment}</span>
            </motion.p>
          )}
          {result.reasons && result.reasons.length > 0 && (
            <motion.ul key="reasons" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-4">
              {result.reasons.map((text, i) => (
                <li key={`${i}-${text}`} className="rounded-2xl bg-white px-6 py-4 text-3xl shadow-sm">
                  “{text}”
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-8 flex justify-center">
        <AnimatePresence>
          {protesters.length > 0 && (
            <motion.div
              key="protest"
              initial={{ y: -120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="rounded-full bg-brand-deep px-10 py-4 font-display text-4xl text-white"
            >
              {protesters.join(', ')} 님, 억울함을 표명했습니다
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 반응 레이어와 최종 화면**

`apps/web/src/components/stage/ReactionLayer.tsx`:

```tsx
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
```

`apps/web/src/components/stage/StageFinal.tsx`:

```tsx
'use client';

import { motion } from 'motion/react';
import type { StageView } from '@ojt/game';
import { formatElapsed } from '@/lib/format';

export function StageFinal({ view }: { view: StageView }) {
  const titles = view.titles ?? [];
  const elapsed = view.startedAt !== null && view.endedAt !== null ? formatElapsed(view.endedAt - view.startedAt) : null;
  const credit = process.env.NEXT_PUBLIC_TEAM_CREDIT;

  return (
    <div className="flex h-full flex-col gap-10">
      <h1 className="font-display text-6xl text-brand-deep">오늘 우리가 본 서로의 이미지</h1>
      <ul className="grid flex-1 grid-cols-2 content-start gap-6" style={{ perspective: 1400 }}>
        {titles.map((t, i) => (
          <motion.li
            key={t.playerId}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.7, duration: 0.6, ease: 'easeOut' }}
            className="rounded-3xl bg-white p-8 shadow-sm"
          >
            <p className="text-3xl font-bold">{t.name}</p>
            <p className="mt-2 font-display text-4xl text-brand-deep">{t.title}</p>
            {t.note && <p className="mt-2 text-2xl text-muted">{t.note}</p>}
          </motion.li>
        ))}
      </ul>
      <footer className="flex justify-between text-xl text-muted">
        <span>{credit ?? ''}</span>
        <span>{elapsed ? `소요 시간 ${elapsed}` : ''}</span>
      </footer>
    </div>
  );
}
```

- [ ] **Step 5: 타입 검사와 빌드**

Run: `npm run typecheck -w @ojt/web && npm run build -w @ojt/web`
Expected: 오류 없음.

- [ ] **Step 6: 수동 확인 (무대 + 운영자 + 참가자 4)**

Task 9의 방법으로 참가자 4명을 준비하고, vibescraper MCP로 사용자가 활성화한 탭에서 `http://localhost:3000` → 방 코드 입력 → "무대 화면 열기"를 한 뒤 F11로 전체화면.
Expected:
- 입장 대기: QR, 접속 주소, 규칙 3줄, 이름 카드가 튀어나오며 들어오고 살짝 떠다닌다.
- 투표 중: 질문 카드가 뒤집히며 나오고, 투표한 사람 카드가 투표함으로 들어가며 투표함이 차오른다. 1명 남으면 그 카드가 깜빡인다.
- 결과: 막대 → 1위 배지와 멘트 → 예상 vs 실제가 10초 안에 끝난다. 0표는 흐리다.
- 운영자 "이유 보기" → 이유 최대 2개. 운영자가 숨긴 이유는 나오지 않는다.
- 참가자 반응 → 아래에서 글자가 떠오른다. 1위가 "억울" → 위에서 배너.
- 7번째 결과 후 운영자 "최종 결과 보기" → 칭호 카드가 한 장씩 뒤집힌다. 0표인 사람은 "미스터리 담당".
- 운영자 "게임 종료" → 무대 "감사합니다", 참가자 "게임 끝".
- macOS/Windows의 "동작 줄이기"를 켜면 움직임이 거의 없어진다.

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat(web): stage screens with reveal sequence and reactions" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: 배포 설정, 운영 문서, 리허설

**Files:**
- Create: `render.yaml`, `README.md`

**Interfaces:**
- Consumes: Task 6 빌드/시작 스크립트, Task 7 환경 변수
- Produces: Render 서비스 `ojt-realtime`, Vercel 프로젝트(Root Directory `apps/web`), 당일 운영 절차

- [ ] **Step 1: Render 설정**

`render.yaml`:

```yaml
services:
  - type: web
    name: ojt-realtime
    runtime: node
    plan: free
    buildCommand: npm ci && npm run build -w @ojt/server
    startCommand: npm run start -w @ojt/server
    healthCheckPath: /health
    envVars:
      - key: NODE_VERSION
        value: "22"
      - key: WEB_ORIGIN
        sync: false
```

- [ ] **Step 2: README**

`README.md`:

````markdown
# 누가 가장 그럴까? (OJT 아이스브레이킹)

PRD: https://claude.ai/code/artifact/8b97616e-4432-4ce6-8507-e3779d38dc00

## 구조

- `packages/game` 게임 규칙 (순수 TypeScript, 테스트 있음)
- `apps/server` 실시간 서버 (Socket.IO, Render)
- `apps/web` 화면 (Next.js, Vercel)

## 로컬 실행

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
npm run dev:server   # http://localhost:4000
npm run dev:web      # http://localhost:3000
npm test
```

폰으로 테스트할 때는 `apps/web/.env.local`의 `NEXT_PUBLIC_SOCKET_URL`을 `http://<노트북 LAN IP>:4000`으로 바꾸고 web을 재시작한 뒤 `http://<노트북 LAN IP>:3000`으로 접속한다.

## 질문 바꾸기

`packages/game/src/questions.ts`만 고친다. 본편 7개(`spare: false`), 예비 3개(`spare: true`), 실수형(`mistake: true`)은 본편에 최대 1개. 수위 기준은 PRD 6절. 고친 뒤 `npm test`.

## 배포

0. GitHub: `gh repo create ojt-web-game --private --source . --remote origin` 후 `git push -u origin main`.
1. Render: 이 저장소로 Blueprint를 만들면 `render.yaml`이 `ojt-realtime`을 만든다. `WEB_ORIGIN`에 Vercel 주소(예: `https://ojt-game.vercel.app`)를 넣는다. 여러 개면 쉼표로 구분.
2. Vercel: 새 프로젝트, Root Directory `apps/web`. 환경 변수 `NEXT_PUBLIC_SOCKET_URL=https://<render 서비스>.onrender.com`, `NEXT_PUBLIC_TEAM_CREDIT=Made by 정보시스템팀 류명효 대리`.
3. 배포 후 `https://<render 서비스>.onrender.com/health`가 `ok`인지 확인.

## 당일 운영

1. 교육 10분 전: 노트북에서 Vercel 주소를 연다 (Render 서버가 깨어나는 데 최대 1분).
2. 운영자 폰: Vercel 주소 → "방 만들기". 방 코드 4자리 확인.
3. 노트북: 첫 화면에 방 코드 입력 → "무대 화면 열기" → F11 전체화면.
4. 신입사원: 프로젝터의 QR을 카메라 앱으로 찍고 이름 입력.
5. 운영자 폰: "시작" → 라운드마다 결과 확인 후 필요하면 "이유 보기" → "다음 문제".
6. 7번째 결과 후 "최종 결과 보기" → 칭호 화면 → "게임 종료" → Alt+Tab으로 PPT.

문제가 생기면: 투표 안 한 사람이 있으면 "결과 공개", 분위기에 안 맞는 문제는 "이 문제 건너뛰기", 시간이 없으면 "조기 종료".
````

- [ ] **Step 3: 전체 검증**

Run: `npm test && npm run typecheck && npm run build -w @ojt/server && npm run build -w @ojt/web`
Expected: 모든 테스트 PASS, 타입 오류 없음, 두 빌드 성공.

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "docs: deployment config and operating guide" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: GitHub 원격 저장소와 배포 (실행 직전에 사용자 확인)**

외부에 올리는 작업이므로 아래 명령을 실행하기 전에 저장소 이름과 공개 범위(비공개 권장)를 사용자에게 확인한다.

```bash
gh auth status
gh repo create ojt-web-game --private --source . --remote origin
git push -u origin main
```

그다음 README의 "배포" 절차대로 Render Blueprint와 Vercel 프로젝트를 이 저장소에 연결한다. Vercel 환경 변수에 `NEXT_PUBLIC_SOCKET_URL`과 `NEXT_PUBLIC_TEAM_CREDIT=Made by 정보시스템팀 류명효 대리`를 넣는다.

- [ ] **Step 6: 리허설 (PRD 출시 전 점검)**

배포된 주소로 PRD 10절 체크리스트를 진행한다:
- 폰 4대 + 운영자 폰 + 노트북으로 7라운드 전체, 소요 시간 측정 (목표 10분 이내)
- 화면 잠금, 새로고침, 와이파이↔LTE 전환 후 복귀
- iPhone Safari와 Android Chrome 각각
- 교육장 프로젝터에서 글자 크기, 색, 폰트(써라운드가 질문 10개와 멘트의 모든 글자를 표시하는지)
- 교육장 와이파이와 LTE로 QR 접속 (와이파이에서 Socket.IO가 WebSocket으로 전환되는지 브라우저 개발자 도구 Network 탭에서 확인. 막혀 있어도 롱폴링으로 동작해야 한다)
- 폰에서 "보내기"를 누른 순간부터 무대 체크 표시까지의 지연 (PRD 목표 0.5초 이내, 와이파이와 LTE 각각)
- 운영자 링크 복사 후 다른 기기에서 열어 운영자 권한이 넘어가는지

- [ ] **Step 7: 안티 슬롭 Delivery Gate 보고**

배포본에서 아래를 직접 눌러 보고, 항목마다 근거를 붙인 PASS/FAIL 표를 사용자에게 보고한다. FAIL이 하나라도 있으면 고친 뒤 다시 돌린다.

- 버튼 클릭 기록: 첫 화면(방 만들기, 무대 화면 열기, 잘못된 코드), 운영자(시작, 결과 공개, 이 문제 건너뛰기, 이유 보기, 숨기기, 다음 문제, 최종 결과 보기, 조기 종료, 게임 종료, 이름 수정, 제외, 입장 허용, 운영자 링크 복사), 참가자(입장, 카드 선택, 다음, 건너뛰기, 뒤로, 숫자, 보내기, ㅋㅋㅋ, 인정, 억울). 각 버튼이 실제로 무엇을 했는지 한 줄씩.
- 상태: 빈 상태(참가자 0명, 1위 이유 없음), 대기 상태(서버에 연결하는 중), 오류 상태(없는 방 코드, 같은 이름, 서버 꺼짐).
- 화면 문구에 em dash(—), "...", 범용 문구가 없는지 `grep -rn "—" apps/web/src`와 `grep -rn "\.\.\.<\|\.\.\.'" apps/web/src`(문구 끝의 말줄임표만 잡고 `...props` 같은 전개 구문은 제외) 결과 모두 0건.
- 대비: 작은 글자에 미들 블루, 스카이 블루, 회색 400 이하가 쓰이지 않았는지 `grep -rn "text-brand-mid\|text-brand-sky\|text-gray-[1-4]00" apps/web/src` 결과를 하나씩 확인 (큰 글자만 허용).
- 키보드: 노트북에서 Tab만으로 첫 화면과 운영자 화면을 끝까지 조작할 수 있고, 포커스 외곽선이 보인다.
- 모바일: 360px 폭에서 가로 스크롤이 없다. 8명 기준 이름 카드와 결과 막대가 잘리지 않는다.
