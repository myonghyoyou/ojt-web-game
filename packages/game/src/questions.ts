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
