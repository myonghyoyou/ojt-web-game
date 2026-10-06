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
npm run dev:web      # http://localhost:3000 (3000번을 다른 앱이 쓰면: npm run dev -w @ojt/web -- -p 3100)
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
