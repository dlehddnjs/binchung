# 회고

## #1 리포 부트스트랩
로컬 기본 Node(20.20.2)가 pnpm 11.8.0 요구사항(22.13+)보다 낮아 매 명령을 `nvm use 22`로 감싸야 했다 — `.nvmrc` 추가로 문서화했지만, 다음 이슈부터는 셸 진입 시 자동 적용되는지 확인할 것. Next.js build가 `eslint-config-next` 없이도 통과는 하지만 경고를 남김 — 실제 웹 UI 작업 시작하는 이슈(#8/#9)에서 추가.

## #2 API 픽스처 파서
resultCode≠00인 XML 에러 응답을 실호출로 한 번도 못 만났다 (관측된 에러는 전부 401/504 비XML 인프라 실패) — synthetic fixture로 대체했는데, 나중에 진짜 에러코드 응답을 우연히 만나면 실제 픽스처로 교체하고 synthetic은 지울 것. 두 파서가 envelope 파싱을 공유하니 이슈 #6에서 재시도/백오프 로직을 짤 때도 `ParseError` 타입 3종(NOT_XML/API_ERROR/MALFORMED_XML)을 그대로 분기 기준으로 재사용하면 될 듯.

## #3 도메인 함수 (stat 매핑/급속완속/diff)
설계문서에 원래 `isFastCharger(chgerType): boolean`으로 박혀있던 함수를 구현 중에 `classifyChargerSpeed(...): "fast"|"slow"|"unknown"`으로 이름과 반환타입을 바꿨다 — boolean/boolean|null로는 "미지 코드"를 falsy(=slow)로 오독할 위험이 있었음. 코드보다 문서를 먼저 갱신하는 CLAUDE.md 규칙을 지키려 `docs:` 커밋을 구현 커밋 앞에 별도로 넣었는데, 이슈 진행 중 설계문서 자체를 고쳐야 하는 상황이 처음이라 절차가 명확해서 다음에도 같은 패턴(설계 재검토 → 사용자 확인 → docs 커밋 → test/feat 커밋) 그대로 쓰면 될 듯. `computeStatusDiff`의 "배치 내 중복 보고는 원본 current 기준 독립 비교" 테스트가 실제로 구현 버그(캐스케이딩)를 예방하는 걸 확인 — 비슷하게 상태가 누적되는 함수를 짤 때마다 이 패턴의 테스트를 기본으로 넣을 것.

## #4 DB 마이그레이션 + docker-compose
작업 환경에 Docker도 로컬 Postgres도 없어서 `docker compose up`을 직접 실행해 검증하지 못했다 — smoke test를 `skipIf(!DATABASE_URL)`로 만들고 CI(GitHub Actions postgres service)에서 실제 검증되게 우회했다. 다음에 DB 관련 이슈(#5/#6/#7)를 진행할 때도 이 환경 제약이 그대로일 테니, "로컬에서 직접 못 돌리는 것"을 전제로 CI 의존도를 높이는 패턴을 계속 쓸 것 — 단, push 후 반드시 CI 결과를 확인해서 "로컬에서 안 됐으니 CI로 미룸"이 "검증을 안 함"으로 슬쩍 바뀌지 않게 주의. node-pg-migrate의 SQL 모드는 파일 하나에 `-- Up Migration`/`-- Down Migration` 마커로 구분되는 방식(별도 up.sql/down.sql 파일 아님) — 미리 안다고 착각하지 않고 `create` 커맨드로 실제 생성해본 게 맞았음.
