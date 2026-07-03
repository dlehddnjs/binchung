# ⚡ 충전맵 (가칭) — Phase 1 설계 문서

> 실시간 전기차 충전소 빈자리 지도.
> Phase 1 목표: **"전국 충전기 상태가 지도에 표시되고, 백그라운드에서 히스토리가 쌓이기 시작한다."**
>
> 작성일: 2026-07-02 · 상태: Draft → 착수 전 리뷰 필요 항목은 ⚠️ 표시

---

## 1. 목표 / 비목표

### Phase 1 목표 (Definition of Done)
1. 수집 서버가 5분 주기로 충전기 상태를 DB에 적재하고 있다 (히스토리 누적 시작).
2. 웹에서 OpenLayers 지도에 충전기 상태(대기/충전중/기타)가 색상으로 표시된다.
3. 필터가 동작한다: 지역(시도), 급속/완속, 현재 상태.
4. Vercel(웹) + 수집 워커(상시 프로세스)로 배포되어 실제로 굴러간다.
5. 순수 로직(파서, diff, 상태 매핑)은 test-first 커밋 히스토리와 함께 테스트되어 있다.

### 비목표 (Phase 2+ 로 명시적 연기)
- WebSocket 실시간 푸시 (Phase 2)
- WebGLPointsLayer / Web Worker 성능 최적화 (Phase 3 — 단, Phase 1에서 baseline 측정치는 기록해 둔다)
- 혼잡 패턴 / 예측 (Phase 4)
- 회원/로그인, 즐겨찾기

---

## 2. 데이터 소스: 환경부(한국환경공단) EvCharger API

- Base URL: `http://apis.data.go.kr/B552584/EvCharger`
- 엔드포인트:
  - `getChargerInfo` — 충전소/충전기 **정적 정보 + 상태** 전체 (statNm, statId, chgerId, chgerType, addr, lat, lng, useTime, busiNm, stat, statUpdDt 등)
  - `getChargerStatus` — 충전기 **상태 변경분** 조회 (statId, chgerId, stat, statUpdDt 등)
- 공통 파라미터: `serviceKey`, `pageNo`, `numOfRows`, `zcode`(시도코드, 예: 11=서울)
- `getChargerStatus` 전용: `period` — 최근 n분 내 상태가 갱신된 건만 조회. ✅ **검증 완료 (활용가이드 v1.23): 기본값 5, 최소 1, 최대 10 (분). numOfRows는 최소 10, 최대 9999.** → 5분 주기 델타 수집 설계 유효.
- ✅ **실호출 검증 완료 (2026-07-03)**: `statId`/`chgerId` 없이 `period`+`zcode`만으로 목록 조회 성공 확인 (`period=10&zcode=11&numOfRows=10` → `resultCode=00`, `totalCount=1706`). 가이드의 필수(1) 표기는 오기로 확정.
- ✅ **`zcode`도 생략 가능, 전국 단일 조회 지원 확정**: `zcode` 없이 `period=10&numOfRows=10`만으로 호출 → `resultCode=00`, `totalCount=11800`(전국, 10분 윈도우). 시도코드 순회(17개 zcode 반복 호출) 불필요 — 델타 폴링은 zcode 없이 **단일 요청**으로 전국을 커버한다. → §3 트래픽 예산 표 갱신 완료.
- ⚠️ **API 자체의 안정성이 낮음 — numOfRows 크기 문제로 단정할 수 없음.** 최초 관찰(2026-07-03 오전)에서는 동일 조건(`period=10&zcode=11`)에서 `numOfRows=100`만 504 Gateway Timeout, `numOfRows=10`은 성공 → "numOfRows 크기가 원인"으로 잠정 결론했었음. 그런데 같은 날 재검증 시도에서 `numOfRows=30`, `20`, 그리고 **이전에 성공했던 10과 zcode=11 getChargerInfo 정상 조합까지 전부 30초 완전 타임아웃**으로 실패 (4연속). 즉 numOfRows 값과 무관하게 서비스 자체가 간헐적으로 응답하지 않는 것으로 보임. **결론 수정**: numOfRows 상한을 특정하는 실험은 이 API의 불안정성 앞에서 의미가 크지 않다 — 크기와 무관하게 타임아웃/504가 발생할 수 있다고 가정하고 설계한다. collector는 (a) 작은 numOfRows를 기본값으로 쓰되 크기가 만능 해결책이 아님을 인지, (b) 지수 백오프 재시도, (c) 한 주기 실패 시 다음 주기로 자연 복구(수집 실패를 심각한 장애로 취급하지 않음) 세 가지를 반드시 갖춘다. → §10 리스크 갱신.
- ✅ **`getChargerInfo`도 `zcode` 생략 시 전국 단일 조회 지원 확정 (이슈 #5, 2026-07-03)**: `zcode` 없이 `numOfRows=10&pageNo=1` 호출(1차 타임아웃, 2차 재시도 성공) → `resultCode=00`, **`totalCount=530801`**(전국 충전기 레코드 수). zcode 순회 불필요 — full sync는 zcode 없이 단일 페이지네이션 루프로 전국을 커버한다(§3 갱신). 이 숫자는 `numOfRows` 선택에 직접적인 함의가 있다 — 아래 §3 참고.

### 상태 코드 (stat) ✅ 활용가이드 v1.23 확정
| 코드 | 의미 | UI 색 |
|---|---|---|
| 0 | 알수없음 | 회색 |
| 1 | 통신이상 | 회색 |
| 2 | 충전대기 (= 빈자리) | 초록 |
| 3 | 충전중 | 주황 |
| 4 | 운영중지 | 회색 |
| 5 | 점검중 | 회색 |
| 6 | 예약중 | 주황 |
| 9 | 상태미확인 | 회색 |

→ `mapStatToUiStatus(stat: number): "waiting" | "charging" | "other" | "unknown"`는 이 8개 + 그 외 값(방어적 UNKNOWN) 전부를 테스트로 고정. stat=6(예약중)은 색상표상 stat=3(충전중)과 동일(주황)이라 "charging" 버킷에 병합 — §1의 "대기/충전중/기타" 3버킷 프레이밍과 일치시킴(이슈 #3, 2026-07-03).

### 충전기 타입 (chgerType) ✅ 활용가이드 v1.23 확정
`01` DC차데모, `02` AC완속, `03` DC차데모+AC3상, `04` DC콤보, `05` DC차데모+DC콤보, `06` DC차데모+AC3상+DC콤보, `07` AC3상, `08` DC콤보(완속), `09` NACS, `10` DC콤보+NACS, `11` DC콤보2(버스전용)
→ 급속/완속 판정: `02`(AC완속), `08`(DC콤보 완속)만 완속, 나머지는 급속. 도메인 함수 `classifyChargerSpeed(chgerType: string): "fast" | "slow" | "unknown"`으로 캡슐화 (테스트 대상 1호). NACS 포함 신규 코드 추가 이력이 있으니 미지 코드는 UNKNOWN 처리. ⚠️ **함수명 변경 이력(이슈 #3, 2026-07-03)**: 원래 `isFastCharger(chgerType): boolean`으로 계획했으나, `boolean`/`boolean | null`은 미지값을 falsy(=slow)로 오독할 위험이 있어 3값 문자열 union + 이름 변경으로 확정.

---

## 3. 트래픽 예산 (핵심 제약)

**개발계정: 1,000 요청/일.** 운영계정은 활용사례 등록 후 증가 신청 가능.

**✅ 실측 완료 (2026-07-03)**: `getChargerStatus`는 `zcode` 없이 **전국 단일 요청**으로 델타 조회 가능. `period=10&numOfRows=10` → `totalCount=11800`(전국, 10분 윈도우). 시도코드 순회가 필요 없어졌으므로 폴링 1회 = 요청 1페이지(또는 소수 페이지)로 끝난다 — 아래 표는 이 실측치 기반.

| 전략 | 계산 | 판정 |
|---|---|---|
| 5분마다 전국 전체 재수집(getChargerInfo) | 288회/일 × 전국 페이지 수십 페이지 = 수천~수만 건 | ❌ 불가능 |
| 최초 1회 full sync + 5분마다 델타(`getChargerStatus?period=5`, zcode 생략, 전국 단일 요청) | full sync 1회성(페이지 수는 §8 참고, 이번 스코프 밖) + 288회/일 × 델타 1페이지 ≈ **288건/일** (numOfRows 안전 상한 확정 전 잠정치) | ✅ 예산 내, 여유 큼(예산의 ~29%) |
| 폴백: 10분 주기 델타 | 144회/일 × 1페이지 ≈ **144건/일** | ✅ 매우 여유 |

**설계 결론:**
1. **Full sync (getChargerInfo, 전국)**: 최초 1회 + 일 1회 심야(03시)에 정합성 보정용 재실행. 신규 충전소 반영 목적. **✅ 전국 페이지 수 실측 완료(이슈 #5, 2026-07-03)**: zcode 생략, `totalCount=530801`. `numOfRows`를 최댓값(9999)에 가깝게 써야만 페이지 수가 실용적인 범위(≈54페이지)로 떨어진다 — `numOfRows=10`처럼 작은 값을 쓰면 53,081페이지가 되어 하루 예산(1000건)을 한 번의 full sync만으로 53배 초과한다. 즉 **full sync는 numOfRows=9999 사용이 사실상 강제**되고, 이는 §2에서 확인된 "API가 파라미터 크기와 무관하게 간헐적으로 타임아웃난다"는 리스크를 그대로 안고 간다는 뜻이다 — 재시도/부분실패 허용 설계(4번 항목)가 선택이 아니라 필수인 이유. 예산 영향: 54페이지 × (최초 1회 + 일 1회) ≈ **~108건/일**, 델타 폴링(288건/일)과 합쳐도 예산 내.
2. **Delta poll (getChargerStatus, period=5, zcode 생략)**: 5분 주기, 전국 단일 요청. 변경된 충전기만 수신.
3. 수집기는 **일일 요청 카운터**를 유지하고, 예산 90% 도달 시 주기를 10분으로 자동 완화 + 로그 경고.
4. ⚠️ **블로커로 남은 리스크 (numOfRows 크기보다 심각함)**: §2 참고 — API가 파라미터 크기와 무관하게 간헐적으로 완전 타임아웃/504를 반환하는 것을 확인(같은 날 동일 조합도 성공→실패 반복). 즉 "안전한 numOfRows"를 찾는 문제가 아니라 **이 API 자체가 신뢰도 낮은 외부 의존성**이라는 전제로 설계해야 한다. 이 표의 "1페이지/288건" 예산 계산은 API가 응답한다는 전제하의 숫자이고, 실패율 자체는 별개로 다뤄야 한다. **이슈 #6(델타 폴링 구현) 요구사항에 반드시 포함**: 지수 백오프 재시도, 짧은 타임아웃(예: 10~15초)으로 빠르게 실패 판정, 한 주기 실패는 다음 주기로 자연 복구(알림은 연속 실패 N회 이상일 때만).
5. period 최대값(10분)은 활용가이드로 이미 확정. zcode 생략 가능도 이번에 확정 — 시도코드 순환 로직은 불필요, 구현하지 않는다.

> 이 제약이 곧 포트폴리오 스토리: "rate limit 하에서 full sync + delta 파이프라인을 설계했다."

---

## 4. 아키텍처

```
                         ┌──────────────────────────────┐
  환경부 EvCharger API   │  apps/collector (Node worker) │
  ───────────────────▶  │  · 5분 델타 폴링               │
   (5분 delta / 일1회 full)│  · 파싱 → 정규화 → diff 계산   │
                         │  · 일일 요청 예산 관리          │
                         └──────────┬───────────────────┘
                                    │ upsert / append
                                    ▼
                         ┌──────────────────────────────┐
                         │  PostgreSQL (Supabase/Neon)   │
                         │  stations / chargers          │
                         │  charger_status (current)     │
                         │  status_history (append-only) │
                         └──────────┬───────────────────┘
                                    │ read (REST)
                                    ▼
                         ┌──────────────────────────────┐
                         │  apps/web (Next.js App Router)│
                         │  · RSC: 초기 스냅샷 SSR        │
                         │  · Client: OpenLayers 지도    │
                         │  · jotai 상태관리              │
                         └──────────────────────────────┘
```

- **모노레포 (pnpm workspace)**: `apps/web`, `apps/collector`, `packages/core`
- `packages/core`: 도메인 타입 + 순수 함수 (API 응답 파서, stat 매핑, diff 계산, classifyChargerSpeed). **TDD의 주전장. 프레임워크 의존 금지.**
- Phase 1 프론트는 폴링(60초, SWR 또는 TanStack Query)으로 현재 상태 갱신. WebSocket은 Phase 2에서 이 자리에 끼워 넣는다 — 인터페이스를 `StatusFeed` 추상으로 정의해 교체 가능하게.

### 배포
- `apps/web` → Vercel
- `apps/collector` → 상시 프로세스 필요 (5분 크론). 후보: Railway / Fly.io / 집에 있는 미니PC. ⚠️ 결정 필요. Vercel Cron(5분)도 가능하나 실행시간 제한 확인 필요.
- DB → Supabase free tier로 시작. history 테이블 용량 모니터링 (전국 델타 기준 월 수백만 row 가능 → 월 단위 파티셔닝은 Phase 4 전에 검토).

---

## 5. 데이터 모델 (Postgres)

```sql
-- 충전소 (위치의 단위)
CREATE TABLE stations (
  stat_id     TEXT PRIMARY KEY,          -- 환경부 statId
  name        TEXT NOT NULL,             -- statNm
  addr        TEXT,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  zcode       TEXT NOT NULL,             -- 시도코드
  use_time    TEXT,
  busi_nm     TEXT,                      -- 운영기관
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stations_zcode ON stations(zcode);
CREATE INDEX idx_stations_latlng ON stations(lat, lng);

-- 충전기 (상태의 단위, 충전소 1:N)
CREATE TABLE chargers (
  stat_id     TEXT NOT NULL REFERENCES stations(stat_id),
  chger_id    TEXT NOT NULL,
  chger_type  TEXT NOT NULL,             -- 급속/완속 판정은 core에서
  output_kw   NUMERIC,                   -- output 필드 존재 시
  PRIMARY KEY (stat_id, chger_id)
);

-- 현재 상태 (upsert, 지도 렌더링용 단일 소스)
CREATE TABLE charger_status (
  stat_id      TEXT NOT NULL,
  chger_id     TEXT NOT NULL,
  stat         SMALLINT NOT NULL,        -- 1~9
  stat_upd_dt  TIMESTAMPTZ,              -- API 제공 갱신시각
  seen_at      TIMESTAMPTZ NOT NULL,     -- 우리가 관측한 시각
  PRIMARY KEY (stat_id, chger_id)
);

-- 상태 변화 히스토리 (append-only, Phase 4의 자산)
CREATE TABLE status_history (
  id           BIGSERIAL PRIMARY KEY,
  stat_id      TEXT NOT NULL,
  chger_id     TEXT NOT NULL,
  prev_stat    SMALLINT,
  next_stat    SMALLINT NOT NULL,
  stat_upd_dt  TIMESTAMPTZ,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_history_charger_time ON status_history(stat_id, chger_id, recorded_at);
```

**히스토리 적재 규칙**: 델타 수신 건 중 `charger_status`의 현재값과 **stat이 실제로 달라진 것만** history에 append (diff 계산은 `packages/core`의 순수 함수 `computeStatusDiff`). 같은 상태 재보고는 `seen_at`만 갱신.

---

## 6. 웹 (Phase 1 스코프)

- **페이지**: `/` 지도 단일 페이지. RSC에서 초기 스냅샷(뷰포트 or 전국 요약)을 fetch해 SSR → 클라이언트 컴포넌트(OpenLayers)에 주입.
- **API Route**: `GET /api/chargers?bbox=&zcode=&type=&stat=` — DB 조회. bbox 기반 조회를 기본으로.
- **지도**: OpenLayers `VectorLayer` + 표준 `Cluster` source로 시작. 줌 레벨별 스타일. **Phase 1 마지막에 전국 뷰 FPS/frame time을 기록해 둘 것 (Phase 3 before 수치).**
- **상태관리 (jotai)**: `filterAtom`(지역/타입/상태), `viewportAtom`, `chargersAtom`. 지도 인스턴스는 atom에 넣지 않는다 (ref로 관리).
- **UI**: 필터 바 + 지도 + 선택 시 하단 시트(충전소 상세: 충전기 목록/상태/갱신시각). 디자인은 심플하게 — Phase 1은 파이프라인이 주인공.

---

## 7. 테스트 전략 (TDD)

- **도구**: Vitest, @testing-library/react, msw(환경부 API 목킹)
- **test-first 필수 영역** (`packages/core`):
  - `parseChargerInfoResponse` / `parseChargerStatusResponse` — 정상/필드누락/빈목록/에러코드 응답
  - `classifyChargerSpeed(chgerType)` (구 `isFastCharger`, §2 참고)
  - `mapStatToUiStatus(stat)`
  - `computeStatusDiff(current, incoming)` — 변화 감지, 동일상태 재보고, 신규 충전기
  - `RequestBudget` — 일일 카운터, 90% 완화, 자정 리셋(타임존 KST 주의)
- **커밋 컨벤션**: `test:` 커밋이 `feat:` 커밋보다 먼저. 예: `test(core): stat 코드 매핑 실패 케이스` → `feat(core): mapStatToUiStatus 구현`
- **CI**: GitHub Actions — lint / typecheck / test / build. README에 배지.
- 지도 컴포넌트는 E2E 대신 로직 분리(훅/유틸)로 테스트 가능성 확보. OpenLayers 자체를 테스트하지 않는다.

---

## 8. API 신청 체크리스트 (착수 Day 0)

- [x] data.go.kr 회원가입/로그인 (발급된 키로 정상 호출 성공 → 간접 확인)
- [x] "한국환경공단_전기자동차 충전소 정보" (서비스 ID B552584/EvCharger) 활용신청 → 개발계정 키 발급 (동작하는 키로 간접 확인, 자동승인됨)
- [x] **활용가이드(v1.23 docx) 확인 완료**:
  - [x] `period`: 기본 5 / 최소 1 / 최대 10 (분)
  - [x] `numOfRows`: 최소 10 / 최대 9999
  - [x] stat / chgerType 코드표 → §2 표에 반영 완료
- [x] 발급 키로 curl 스모크 테스트 (2026-07-03 실행, 총 7회 호출):
  - [x] `getChargerInfo?zcode=11&numOfRows=10&pageNo=1` 정상 응답 (`resultCode=00`, `totalCount=75389`). ⚠️ `dataType=JSON` 파라미터는 실제로는 사용하지 않음 — 기본 응답 포맷(XML)을 그대로 채택, 픽스처도 전부 `.xml`. 파서(`parseChargerInfoResponse` 등)는 XML 기준으로 구현할 것.
  - [x] `getChargerStatus?period=10&zcode=11&numOfRows=10&pageNo=1` — **statId/chgerId 없이 목록 조회 성공 확인** (가이드 필수 표기는 오기로 확정). 추가로 `zcode`도 생략 가능함을 확인(전국 단일 조회). §2/§3 갱신 완료.
- [x] 응답 원문을 `fixtures/`에 저장 → 파서 테스트 픽스처로 사용 (정상/에러/빈결과 3종 + 추가 케이스, 총 6개):
  - `getChargerInfo-normal.xml` (resultCode=00, totalCount=75389)
  - `getChargerInfo-empty.xml` (resultCode=00, pageNo 범위 초과 → items 빈 배열)
  - `getChargerInfo-autherror.xml` (잘못된 serviceKey → HTTP 401 "Unauthorized", XML 아님 — 파서가 비XML 응답도 방어적으로 처리해야 함을 시사)
  - `getChargerStatus-normal.xml` (zcode=11, numOfRows=10, resultCode=00, totalCount=1706)
  - `getChargerStatus-error.xml` (zcode=11, numOfRows=100 → HTTP 504 Gateway Timeout, XML 아님)
  - `getChargerStatus-nozcode.xml` (zcode 생략, 전국, resultCode=00, totalCount=11800)
  - `getChargerInfo-nozcode.xml` (zcode 생략, 전국, resultCode=00, totalCount=530801 — 이슈 #5)
  - `common-resultcode-error.synthetic.xml` **(synthetic, 실호출 아님)** — resultCode≠00 XML 에러를 실호출로 재현하지 못해(관측된 에러는 전부 401/504 비XML 인프라 실패) data.go.kr 공통 resultCode 표를 근거로 이슈 #2에서 수기 작성. 이슈 #2 §DESIGN 참고.
- [ ] (나중에) 서비스 배포 후 활용사례 등록 → 운영계정 트래픽 증가 신청

---

## 9. 이슈 백로그 (작업 단위)

Phase 1을 이슈 단위로 분해. 각 이슈는 반나절~1일 스코프.

| # | 이슈 | 산출물 |
|---|---|---|
| 1 | 리포 부트스트랩: pnpm workspace, TS strict, eslint/prettier, Vitest, CI | 빈 3패키지 + 초록 CI |
| 2 | API 픽스처 확보 + `packages/core` 파서 (test-first) | parse 함수 + 테스트 |
| 3 | 도메인 함수: stat 매핑, classifyChargerSpeed, computeStatusDiff (test-first) | core 완성 |
| 4 | DB 스키마 마이그레이션 + 로컬 docker-compose | migration SQL |
| 5 | collector: full sync 1회 실행 → stations/chargers 적재 | 전국 데이터 in DB |
| 6 | collector: 델타 폴링 루프 + RequestBudget + diff→history 적재 | 5분 주기 가동 |
| 7 | web: `/api/chargers` (bbox 조회) | API route + 테스트 |
| 8 | web: OpenLayers 지도 + 상태 색상 마커 + 클러스터 | 지도에 점이 뜬다 |
| 9 | web: 필터(jotai) + 충전소 상세 시트 | 인터랙션 완성 |
| 10 | 배포: Vercel + collector 호스팅 + Supabase | 실서비스 URL |
| 11 | baseline 성능 측정 기록 + README + 회고 | Phase 3 before 수치 |

---

## 10. 리스크

| 리스크 | 대응 |
|---|---|
| ~~`period` 파라미터가 기대와 다르게 동작~~ ✅ 가이드로 스펙 확정(최대 10분) + 실호출 검증 완료 | 해소 — 대응 불필요 |
| ~~getChargerStatus의 statId/zcode 필수 표기가 사실일 경우~~ ✅ 둘 다 생략 가능함을 실호출로 확정(전국 단일 요청 지원) | 해소 — zcode 순환 로직 구현 불필요 |
| ⚠️ **API 자체의 간헐적 완전 타임아웃/504** — numOfRows 크기와 무관하게 발생 확인(같은 파라미터 조합이 같은 날 성공 후 재시도에서 4연속 타임아웃). "안전한 파라미터 값"으로 해결되는 문제가 아니라 이 API를 근본적으로 신뢰도 낮은 의존성으로 취급해야 함 | RequestBudget과는 별개로 짧은 타임아웃 + 지수 백오프 재시도를 이슈 #6 필수 요구사항으로 구현. 한 주기 실패는 다음 주기로 넘기고(알림은 연속 N회 실패 시만), 절대 재시도 루프로 예산을 태우지 않는다 |
| 개발계정 키의 갑작스러운 트래픽 차단 | RequestBudget + 지수 백오프. 수집 실패는 다음 주기에 period 확대로 보정 |
| statUpdDt 타임존/포맷 불일치 (`YYYYMMDDHHmmss`, KST) | 파서 테스트로 고정. DB는 전부 TIMESTAMPTZ |
| Supabase free tier 용량 (history 증가) | row 수 주간 모니터링, 필요 시 오래된 history를 시간대별 집계 테이블로 롤업 |
| ChargePark 등 기존 서비스와의 차별화 | Phase 1에선 신경 쓰지 않는다. 승부처는 Phase 2~3의 실시간 UX |
