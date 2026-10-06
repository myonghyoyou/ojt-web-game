import type { PredictionKind, ResultType, Rng } from './types';

export const RESULT_COMMENTS: Record<ResultType, readonly string[]> = {
  unanimous: ['본인 빼고 다 같은 사람 찍었어요.', '고민한 사람이 아무도 없네요.', '다들 바로 떠올렸나 봐요.'],
  tie: ['딱 반반으로 갈렸어요.', '둘 다 그럴 것 같다는 거죠.'],
  normal: ['아슬아슬하게 갈렸어요.', '표는 갈렸어도 1위는 1위예요.'],
  scattered: ['아직 서로 잘 모르는 걸로 할게요.', '다들 조금씩 그럴 것 같대요.'],
};

export const MANY_WAY_TIE_COMMENTS: readonly string[] = ['완전 팽팽해요. 못 고르겠어요.', '공동 1위가 여러 명이에요.'];

export const PREDICTION_COMMENTS: Record<PredictionKind, readonly string[]> = {
  under: ['본인만 몰랐네요.', '본인 생각이랑 완전 달라요.'],
  over: ['기대가 좀 컸나 봐요.', '자신감은 인정할게요.'],
  exact: ['본인도 알고 있었네요.', '자기 객관화 제대로 됐어요.'],
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
