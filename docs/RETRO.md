# 회고

## #1 리포 부트스트랩
로컬 기본 Node(20.20.2)가 pnpm 11.8.0 요구사항(22.13+)보다 낮아 매 명령을 `nvm use 22`로 감싸야 했다 — `.nvmrc` 추가로 문서화했지만, 다음 이슈부터는 셸 진입 시 자동 적용되는지 확인할 것. Next.js build가 `eslint-config-next` 없이도 통과는 하지만 경고를 남김 — 실제 웹 UI 작업 시작하는 이슈(#8/#9)에서 추가.

## #2 API 픽스처 파서
resultCode≠00인 XML 에러 응답을 실호출로 한 번도 못 만났다 (관측된 에러는 전부 401/504 비XML 인프라 실패) — synthetic fixture로 대체했는데, 나중에 진짜 에러코드 응답을 우연히 만나면 실제 픽스처로 교체하고 synthetic은 지울 것. 두 파서가 envelope 파싱을 공유하니 이슈 #6에서 재시도/백오프 로직을 짤 때도 `ParseError` 타입 3종(NOT_XML/API_ERROR/MALFORMED_XML)을 그대로 분기 기준으로 재사용하면 될 듯.

## #3 도메인 함수 (stat 매핑/급속완속/diff)
설계문서에 원래 `isFastCharger(chgerType): boolean`으로 박혀있던 함수를 구현 중에 `classifyChargerSpeed(...): "fast"|"slow"|"unknown"`으로 이름과 반환타입을 바꿨다 — boolean/boolean|null로는 "미지 코드"를 falsy(=slow)로 오독할 위험이 있었음. 코드보다 문서를 먼저 갱신하는 CLAUDE.md 규칙을 지키려 `docs:` 커밋을 구현 커밋 앞에 별도로 넣었는데, 이슈 진행 중 설계문서 자체를 고쳐야 하는 상황이 처음이라 절차가 명확해서 다음에도 같은 패턴(설계 재검토 → 사용자 확인 → docs 커밋 → test/feat 커밋) 그대로 쓰면 될 듯. `computeStatusDiff`의 "배치 내 중복 보고는 원본 current 기준 독립 비교" 테스트가 실제로 구현 버그(캐스케이딩)를 예방하는 걸 확인 — 비슷하게 상태가 누적되는 함수를 짤 때마다 이 패턴의 테스트를 기본으로 넣을 것.

## #4 DB 마이그레이션 + docker-compose
작업 환경에 Docker도 로컬 Postgres도 없어서 `docker compose up`을 직접 실행해 검증하지 못했다 — smoke test를 `skipIf(!DATABASE_URL)`로 만들고 CI(GitHub Actions postgres service)에서 실제 검증되게 우회했다. 다음에 DB 관련 이슈(#5/#6/#7)를 진행할 때도 이 환경 제약이 그대로일 테니, "로컬에서 직접 못 돌리는 것"을 전제로 CI 의존도를 높이는 패턴을 계속 쓸 것 — 단, push 후 반드시 CI 결과를 확인해서 "로컬에서 안 됐으니 CI로 미룸"이 "검증을 안 함"으로 슬쩍 바뀌지 않게 주의. node-pg-migrate의 SQL 모드는 파일 하나에 `-- Up Migration`/`-- Down Migration` 마커로 구분되는 방식(별도 up.sql/down.sql 파일 아님) — 미리 안다고 착각하지 않고 `create` 커맨드로 실제 생성해본 게 맞았음.

## #5 collector full sync (RequestBudget + DB 쓰기 + 오케스트레이션)
두 가지 구조적 문제를 이번에 발견했다. (1) §7에 test-first 필수로 적혀있던 RequestBudget을 이슈 #3에서 빠뜨렸었다 — 백로그 표(§9)의 짧은 요약만 보고 원문(§7)을 다시 대조하지 않은 탓. 이슈 시작 전에 관련 섹션을 전부 훑는 습관이 필요. (2) `@binchung/core`/`@binchung/db`의 package.json이 `main`을 `dist/`로 가리키고 있어서, dist를 정리한 뒤 다른 패키지가 그걸 실제로 import(`fetchWithRetry.test.ts`)하는 첫 순간까지 아무도 몰랐다 — `verify.sh`가 test를 build보다 먼저 돌리는 순서와도 안 맞았음. 내부(미발행) 워크스페이스 패키지는 처음부터 소스를 직접 가리키게 만들 것, dist는 컴파일 검증용으로만.

또, `getChargerInfo`도 zcode 생략 시 전국 조회가 되는 걸 확인했는데 `totalCount=530801`로 예상보다 훨씬 커서 `numOfRows`를 사실상 max(9999)로 못박아야 한다는 게 드러났다 — 트래픽 예산 계산은 새 실측치가 나올 때마다 자릿수 단위로 뒤집힐 수 있으니 "대략 맞겠지"로 넘기지 말고 그때그때 재계산할 것. 로컬에 DB가 없어 `runFullSync`를 끝까지 실행은 못 했지만 `tsx src/index.ts`를 직접 돌려서 "DB 연결 직전까지 전부 정상 동작 + ECONNREFUSED로 실패"까지 확인한 건 유용한 부분 검증 방법이었다 — 다음에도 "전체를 못 돌리면 어디까지는 확실히 도는지"를 확인하는 습관으로 쓸 것.

## #6 델타 폴링 루프 + diff→history 적재
`mapChargerInfoItems`(이슈 #5)가 `stat`/`statUpdDt`를 통째로 버려서 `statUpdDt` 문자열→Date 파싱 함수가 이슈 #2에서 미룬 뒤로 아무 데도 없었다 — 이슈 #5 때 "지금 안 쓰는 필드는 안 옮긴다"는 YAGNI 판단이 맞긴 했지만, 그 필드가 나중에(이슈 #6) 꼭 필요해진다는 걸 §5 스키마를 다시 봤으면 더 일찍 알 수 있었다. 스키마 전체를 보고 "이 이슈에서 안 쓰는 컬럼이 다음 이슈에서 쓰이는지" 한 번 더 확인하는 습관을 붙일 것.

`runDeltaPollOnce`는 `fullSync`와 다르게 페이지를 다 모은 뒤 한 번에 diff/적재하는 배치 방식으로 짰다 — 이유는 `selectChargerStatusRows`가 incoming 전체 키로 한 번에 스코프드 조회를 해야 효율적인데, 스트리밍(페이지별 즉시 처리) 방식이면 매 페이지마다 별도 select를 날려야 해서 비효율적이었을 것. 같은 프로젝트 안에서도 "언제나 같은 패턴"을 기계적으로 복붙하지 말고, 이번처럼 데이터 접근 패턴이 다르면 오케스트레이션 구조도 다르게 가는 게 맞다. `deltaPollLoop`를 `tsx`로 실제 실행해서 tick 예외가 루프를 안 죽이는 것과 SIGINT/SIGTERM 시 깨끗하게 종료되는 것까지 실측 확인한 게 이번에 특히 값졌다 — 무한 루프는 fake timer로 로직만 테스트되지 실제 종료/에러 복구 흐름은 안 잡히니, 상시 프로세스를 만들 때는 반드시 한 번은 진짜로 띄워보고 죽여볼 것.

## #7 web `/api/chargers` (bbox 조회)
`apps/web`이 처음으로 `@binchung/core`/`@binchung/db`를 import하자마자 `next build`가 깨졌다 — 두 패키지의 `package.json` `main`이 `dist`가 아니라 `src/index.ts`를 직접 가리키는데(이슈 #5 결정), 그 소스 내부의 상대 import가 Node ESM 관례대로 `.js` 확장자를 쓴다. `tsc`/`vitest`는 이걸 `.ts`로 알아서 매핑해주지만 Next의 웹팩은 안 해줘서, `apps/web/next.config.ts`에 `resolve.extensionAlias`를 추가해야 했다. `packages/core`/`db`가 "미발행 워크스페이스 패키지는 소스를 직접 가리킨다"고 정한 결정(이슈 #5)이 `tsx`/`vitest`엔 맞았지만 웹팩 소비자가 생기는 순간 전제가 깨진다는 걸 몰랐다 — 새 소비자(특히 다른 번들러/런타임)가 워크스페이스 패키지를 처음 import할 때는 그 소비자의 모듈 해석 방식이 기존 컨벤션과 맞는지 먼저 확인할 것.

`type`/`stat` 쿼리 파라미터를 원시 코드가 아니라 `classifyChargerSpeed`/`mapStatToUiStatus`(이슈 #3)가 이미 정의한 카테고리(`fast`/`slow`, `waiting`/`charging`/`other`)로만 받게 하고, 역방향 변환(`chgerTypesForSpeed`/`statsForUiStatus`)을 기존 Set과 같은 파일에 추가해 단일 소스를 지켰다 — 새 API 계약을 만들 때마다 "이미 있는 분류 로직을 뒤집어서 쓸 수 있는지"부터 확인하는 게, 코드값을 새로 나열하는 것보다 항상 안전하다. DB 통합테스트(`skipIf(!DATABASE_URL)`)만 있으면 로컬에서 이 이슈의 핵심 로직에 대한 신호가 전혀 없다는 걸 알고 있었어서(RETRO #4), `handleChargersRequest`를 fake pool로 분리 테스트해 로컬에서 항상 도는 커버리지를 확보했다 — collector의 `runDeltaPollOnce(deps)` DI 패턴이 web에도 그대로 통했다.

## #8 web OpenLayers 지도 + 상태 색상 마커 + 클러스터
`fetchChargers`가 `fetch("/api/chargers?...")`처럼 상대경로를 그대로 호출하면 Node의 전역 fetch(undici)가 "Failed to parse URL"로 즉시 실패한다는 걸 뒤늦게 발견했다 — 브라우저는 document 기준으로 상대경로를 알아서 절대 URL로 풀어주지만 Node엔 그 "기준 문서"가 없고, 이건 jsdom 환경으로 바꿔도 마찬가지다(jsdom은 DOM 전역만 흉내낼 뿐 전역 fetch를 patch하지 않는다). 클라이언트 전용 훅에서만 쓰이는 코드라 `window.location.origin`으로 명시적 절대 URL을 만드는 걸로 해결 — "브라우저에서만 도는 코드"라도 fetch 관련 로직은 테스트가 Node/jsdom 위에서 돈다는 전제를 깜빡하기 쉬우니 상대경로 fetch를 쓰기 전에 실행 환경을 먼저 의심할 것.

`eslint-config-next`는 legacy `.eslintrc` 전용이라 이 repo의 `eslint@^10`과 peer 충돌이 나서(RETRO #1이 미뤄둔 항목), `@next/eslint-plugin-next`가 내장한 순정 flat config(`flatConfig.coreWebVitals`)를 `FlatCompat` 없이 직접 꽂았다 — 실제로 `<a href>` 규칙이 걸리는 걸 확인해 동작은 검증했지만, `next build`가 자체적으로 찍는 "Next.js plugin was not detected" 경고는 여전히 뜬다(Next가 `eslint-config-next` 패키지 존재 여부로 판단하지, 실제 활성 규칙을 검사하는 게 아니라서). 기능은 되는데 그 경고 문구 자체는 못 없앤다는 걸 문서로 남겨서 나중에 다시 이 문구를 보고 "안 고쳐졌나?"하고 헷갈리지 않게 했다.

이 샌드박스에 macOS Chrome.app이 있다는 걸 활용해 헤드리스 Chrome + CDP(WebSocket)로 실제 페이지를 띄워 콘솔 에러/네트워크 요청/DOM을 직접 확인했다 — OSM 타일 렌더링, `moveend`가 계산한 실제 bbox로 `/api/chargers` 호출, `staleTime`/`refetchInterval` 설계대로 60초 뒤에만 재요청되는 것까지 실측 확인(DB가 없어 최종 응답은 예상대로 500/ECONNREFUSED). "브라우저가 없어서 못 본다"고 넘기기 전에 이 환경에 진짜 브라우저 바이너리가 있는지부터 확인하면, `curl`만으로는 볼 수 없는 hydration/타이머 동작까지 검증할 수 있다.

## #9 web 필터(jotai) + 충전소 상세 시트
FilterBar/DetailSheet는 이 프로젝트에서 처음으로 실제 DOM을 렌더링하는 컴포넌트 테스트였는데, vitest가 기본으로 쓰는 oxc 트랜스폼이 `apps/web`의 `tsconfig.json`(`jsx: "preserve"`, Next 자체 컴파일러용)을 그대로 따라가는 바람에 raw JSX 문법 자체를 못 읽었다 — `esbuild.jsx` 옵션만 주면 될 줄 알았는데 "oxc와 esbuild가 동시에 설정되면 oxc가 우선"이라는 vite 8의 동작 때문에 씹혔고, `oxc: false`로 꺼야 esbuild 옵션이 먹혔다. 또, `test.globals`를 안 켜서 `@testing-library/react`의 자동 cleanup이 동작하지 않아 한 파일 안의 테스트끼리 DOM이 누적되는 것도 뒤늦게 발견 — `vitest.setup.ts`에 명시적 `afterEach(cleanup)`으로 해결. 둘 다 "React 컴포넌트를 실제로 렌더링하는 첫 테스트"에서만 드러나는 문제라, 순수 함수 테스트만 있던 이슈 #7/#8에서는 미리 알 수 없었던 게 자연스럽다.

지역(zcode) 필터는 코드베이스에 zcode→시도명 매핑이 전혀 없어서 이번 이슈 스코프에서 뺐다 — 사용자에게 raw 코드를 그대로 노출하느니, 실제 매핑 표를 확보한 뒤 별도 이슈로 미루는 게 낫다고 판단(사용자 확인 완료). 필터 변경 시 `chargersQueryKey`가 바뀌어 새 쿼리가 되는데, 매번 같은 `initialData`(전국 스냅샷)를 넘기고 있어서 `staleTime`(60초) 동안 필터링 안 된 데이터가 잠깐 보이는 현상을 헤드리스 Chrome으로 실측 확인했다(필터 변경 직후엔 재요청 없다가 60초 뒤에야 새 파라미터로 요청) — 이슈 #8의 팬/줌에도 이미 있던 문제라 이번이 원인은 아니고, 문서에 알려진 한계로만 남기고 고치지 않았다.
