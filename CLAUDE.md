# CLAUDE.md — 충전맵 (EV Charger Realtime Map)

## 프로젝트 한 줄 요약
환경부 EvCharger API를 5분 델타 폴링으로 수집·적재하고, Next.js + OpenLayers로 전국 충전기 상태를 지도에 보여주는 서비스. 설계의 전제와 결정사항은 `docs/DESIGN-phase1.md`가 단일 소스다. **코드와 설계 문서가 충돌하면 작업을 멈추고 문서를 먼저 갱신하라.**

## 구조
```
apps/web        Next.js 15 App Router (지도 UI)
apps/collector  Node 워커 (수집 파이프라인)
packages/core   도메인 타입 + 순수 함수 (프레임워크 의존 절대 금지)
packages/db     DB 마이그레이션(SQL 파일) + 스키마. apps/web·apps/collector가 공유
docs/           설계 문서, 회고
fixtures/       환경부 API 응답 원문 (테스트 픽스처)
```

## 절대 규칙
1. **TDD — packages/core는 예외 없이 test-first.** 실패하는 테스트 커밋(`test:`)이 구현 커밋(`feat:`)보다 반드시 먼저 온다. 테스트 없이 core에 코드를 추가하지 마라.
2. **API 키를 커밋하지 마라.** `.env`는 gitignore. 키가 필요한 코드는 `process.env.EVCHARGER_API_KEY` 참조만.
   - `git init` 직후 가장 먼저 `.gitignore`에 `.env`를 추가한다 (다른 파일보다 먼저).
   - 원격에 처음 push하거나 새 레포를 만들 때는 `git add` 후 `git status`/`git diff --cached`로 `.env`나 키 원문이 스테이징되지 않았는지 반드시 눈으로 확인한 뒤 commit/push한다.
   - `fixtures/`에 API 응답을 저장할 때도 응답 본문에 요청 키가 echo되지 않는지 확인한다 (요청 URL의 `serviceKey=`는 저장 대상 아님, 응답 바디만 저장).
   - `verify.sh`의 secret scan(`serviceKey=` 패턴 grep)은 최종 방어선이지 유일한 방어선이 아니다 — 위 수동 확인을 생략하지 마라.
3. **트래픽 예산을 깨는 코드를 쓰지 마라.** 환경부 API 호출은 반드시 `RequestBudget`을 경유한다. 테스트/개발 중 실 API 직접 호출 금지 — fixtures와 msw를 사용.
4. **검증 없는 완료 선언 금지.** 모든 작업 단위는 `./verify.sh` 통과 후에만 완료다.
5. **stat/chgerType 등 코드값을 추측으로 추가하지 마라.** 활용가이드에 없는 값은 `UNKNOWN` 처리하고 TODO 주석 + 문서에 ⚠️ 기록.

## 워크플로우
- 작업은 `docs/DESIGN-phase1.md` §9 백로그의 이슈 단위로만 진행. 이슈 번호를 브랜치/커밋에 명시 (`feat(core): #3 computeStatusDiff`).
- 이슈 완료 시: verify 통과 → 간단 회고 1~3줄을 `docs/RETRO.md`에 append (막힌 것, 다음 이슈에 반영할 것).
- 커밋 컨벤션: `test:` `feat:` `fix:` `refactor:` `chore:` `docs:` + scope는 패키지명.

## 명령어
```bash
pnpm install
pnpm -r test          # 전체 테스트
pnpm -r typecheck
pnpm -r lint
pnpm --filter web dev
pnpm --filter collector dev   # 로컬은 fixtures 모드 기본
docker compose up -d --wait   # 로컬 Postgres
pnpm --filter @binchung/db migrate:up
pnpm --filter @binchung/db migrate:down
./verify.sh           # lint + typecheck + test + build 일괄
```

## 기술 결정 (변경 시 문서 먼저)
- 상태관리: jotai (Redux 쓰지 않는다)
- 지도: OpenLayers `ol` (Leaflet/Mapbox 쓰지 않는다 — 채용공고 정렬 목적의 의도적 선택)
- 데이터 fetching: TanStack Query (Phase 1은 60초 폴링; Phase 2에서 `StatusFeed` 인터페이스 뒤로 WebSocket 교체 예정 — 이 추상을 우회하지 마라)
- 테스트: Vitest + @testing-library/react + msw
- DB: Postgres. 스키마 변경은 마이그레이션 파일로만 — `node-pg-migrate` + 손으로 쓴 `.sql` 파일이 유일한 소스(ORM 스키마 DSL 도입 안 함, `packages/db/migrations/`). 로컬 개발은 루트 `docker-compose.yml`(더미 자격증명, 실 시크릿 아님).

## 자주 하는 실수 방지
- `statUpdDt`는 `YYYYMMDDHHmmss` KST 문자열이다. Date 파싱 시 타임존 명시 필수.
- 환경부 API는 HTTP(비 HTTPS)다. collector에서만 호출하고 브라우저에서 직접 호출하지 마라.
- OpenLayers 객체(Map, Layer)는 React 상태/atom에 넣지 마라. ref + 이벤트로만.
- 델타 응답의 "변경 없음 재보고"를 history에 넣지 마라 — `computeStatusDiff`가 판단한다.
