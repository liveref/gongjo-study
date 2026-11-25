# 차곡차곡 공조 · 나의 기출문제은행

공조냉동기계기사 실기 기출 314문제, 기존 기록 항목 342개를 수록한 학습 사이트입니다.

현재 운영 주소: https://gongjo-study-2018-sj.lakefeline.chatgpt.site/

## 수록 기능

- PDF 기준 유형 및 선수학습 순서
- 연도·회차·문제 번호와 교재 첫 페이지
- 계산·서술·도면 구분과 원본 교재 사진
- 회독 별표, 숨기기, 오답노트 및 옅은 붉은 카드 표시
- 기존 Sites 환경에서의 로그인 및 기기 간 학습 기록 동기화

## 저장소 이전

기존 Sites 버전 12의 소스 스냅샷을 가져왔습니다. 교재 사진과 문제 데이터는 원본 파일을 그대로 보존합니다. 개인정보·학습 기록 데이터베이스·비밀키·로컬 환경 파일은 포함하지 않습니다. 교재 사진이 포함되어 저장소를 비공개로 유지합니다.

독립된 GitHub 저장소에서도 검증할 수 있도록 과거 대조 기준 파일을 tests/baseline에 보존했습니다. 테스트가 이전 비공개 Git 이력에 의존하지 않습니다.

## 실행과 검증

Node.js 22.13 이상이 필요합니다.

```sh
npm ci
npm run dev
node --test tests/catalog.test.mjs tests/curriculum.test.mjs tests/store.test.mjs tests/sync.test.mjs
npm run build
```

## GitHub Pages 배포

이 저장소는 GitHub Pages에서 직접 실행하는 정적 배포본을 제공합니다. `.github/workflows/pages.yml`이 314문제와 기록 보존 검사를 실행한 다음 `scripts/build-pages.mjs`로 사이트를 만들어 배포합니다.

배포 주소: https://liveref.github.io/gongjo-study/

```sh
node scripts/build-pages.mjs
```

GitHub Pages의 회독·오답노트 기록은 사용하는 브라우저에 저장됩니다. 기기를 옮길 때에는 기록 백업·복원을 사용하세요. 서버 로그인과 자동 동기화는 GitHub Pages에서 지원하지 않습니다.

기존 Sites에 저장된 기록을 가져오려면 기존 사이트에서 로그인 후 기록 백업을 받고 새 사이트에서 복원하세요. 새 주소로 자동 이전되지는 않으며, 기존 서비스의 서버 기록은 변경하지 않습니다.

기존 서버용 소스와 `public/sync.js`는 보존하고, Pages 배포본만 `public/sync-pages.js`를 사용합니다. 문제 데이터·사진·학습 순서는 그대로입니다. 사용자의 동의를 받아 코드와 교재 사진을 공개하는 저장소입니다.
