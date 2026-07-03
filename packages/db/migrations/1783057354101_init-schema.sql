-- Up Migration

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

-- Down Migration

DROP TABLE IF EXISTS status_history;
DROP TABLE IF EXISTS charger_status;
DROP TABLE IF EXISTS chargers;
DROP TABLE IF EXISTS stations;
