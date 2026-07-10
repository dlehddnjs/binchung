-- Up Migration

-- 환경부 API가 철거/폐쇄된 충전기를 delYn=Y로 계속 내려주는데 이 필드를 안 읽고 있었다.
-- 지도(selectChargersInBbox)에서 제외하려면 저장해둬야 한다.
ALTER TABLE chargers ADD COLUMN del_yn BOOLEAN NOT NULL DEFAULT false;

-- Down Migration

ALTER TABLE chargers DROP COLUMN del_yn;