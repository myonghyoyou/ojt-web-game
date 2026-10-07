const MESSAGES: Record<string, string> = {
  NAME_INVALID: '이름은 1~6자로 입력해 주세요.',
  NAME_TAKEN: '이미 있는 이름이에요.',
  ROOM_FULL: '방이 가득 찼어요.',
  ROOM_NOT_FOUND: '그 번호의 방이 없어요. 앞 화면의 방 번호를 다시 확인해 주세요.',
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
  RATE_LIMITED: '잠깐 사이에 너무 많이 눌렀어요. 1분 뒤에 다시 시도해 주세요.',
  TIMEOUT: '서버 응답이 늦어요. 잠시 후 다시 시도해 주세요.',
};

export function messageFor(code: string): string {
  return MESSAGES[code] ?? '문제가 생겼어요. 다시 시도해 주세요.';
}
