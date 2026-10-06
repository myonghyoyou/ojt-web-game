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
