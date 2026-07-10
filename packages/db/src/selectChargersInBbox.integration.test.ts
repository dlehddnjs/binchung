import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { selectChargersInBbox } from "./selectChargersInBbox.js";

const databaseUrl = process.env.DATABASE_URL;

// 서울 인근 bbox — A/C를 포함하고 B(부산)는 지리적으로 배제한다.
const SEOUL_BBOX = { minLng: 126.9, minLat: 37.4, maxLng: 127.2, maxLat: 37.7 };
// A/B/C를 전부 포함하는 넓은 bbox — bbox 자체는 걸러내지 않고 다른 필터 차원만 검증할 때 사용.
const WIDE_BBOX = { minLng: 126, minLat: 34, maxLng: 130, maxLat: 38 };
const EMPTY_BBOX = { minLng: 0, minLat: 0, maxLng: 1, maxLat: 1 };

const STAT_A = "TEST_BBOX_A"; // 서울, zcode 11, 완속(02), waiting(2)
const STAT_B = "TEST_BBOX_B"; // 부산, zcode 26, 급속(04), charging(3) — SEOUL_BBOX 밖
const STAT_C = "TEST_BBOX_C"; // 서울, zcode 11, 급속(04), charging(3) + status 없는 충전기 하나

describe.skipIf(!databaseUrl)("selectChargersInBbox", () => {
  const pool = new Pool({ connectionString: databaseUrl });

  beforeAll(async () => {
    await pool.query(
      `INSERT INTO stations (stat_id, name, lat, lng, zcode) VALUES
        ($1, 'A', 37.5, 127.0, '11'),
        ($2, 'B', 35.0, 129.0, '26'),
        ($3, 'C', 37.6, 127.1, '11')
      ON CONFLICT (stat_id) DO NOTHING`,
      [STAT_A, STAT_B, STAT_C],
    );

    await pool.query(
      `INSERT INTO chargers (stat_id, chger_id, chger_type) VALUES
        ($1, '01', '02'),
        ($2, '01', '04'),
        ($3, '01', '04'),
        ($3, '02', '04')
      ON CONFLICT (stat_id, chger_id) DO NOTHING`,
      [STAT_A, STAT_B, STAT_C],
    );

    await pool.query(
      `INSERT INTO charger_status (stat_id, chger_id, stat, seen_at) VALUES
        ($1, '01', 2, now()),
        ($2, '01', 3, now()),
        ($3, '01', 3, now())
      ON CONFLICT (stat_id, chger_id) DO NOTHING`,
      [STAT_A, STAT_B, STAT_C],
    );
    // STAT_C의 '02' 충전기는 의도적으로 charger_status가 없음 (INNER JOIN 제외 검증용)
  });

  afterAll(async () => {
    await pool.query("DELETE FROM charger_status WHERE stat_id = ANY($1::text[])", [
      [STAT_A, STAT_B, STAT_C],
    ]);
    await pool.query("DELETE FROM chargers WHERE stat_id = ANY($1::text[])", [
      [STAT_A, STAT_B, STAT_C],
    ]);
    await pool.query("DELETE FROM stations WHERE stat_id = ANY($1::text[])", [
      [STAT_A, STAT_B, STAT_C],
    ]);
    await pool.end();
  });

  test("bbox 안의 충전기만 반환하고, status가 없는 충전기는 제외한다", async () => {
    const { rows, truncated } = await selectChargersInBbox(pool, SEOUL_BBOX);
    const keys = rows.map((r) => `${r.statId}/${r.chgerId}`).sort();

    expect(keys).toEqual([`${STAT_A}/01`, `${STAT_C}/01`]);
    expect(truncated).toBe(false);
  });

  test("zcode 필터는 bbox와 독립적으로 적용된다", async () => {
    const { rows } = await selectChargersInBbox(pool, { ...WIDE_BBOX, zcode: "11" });
    const keys = rows.map((r) => `${r.statId}/${r.chgerId}`).sort();

    expect(keys).toEqual([`${STAT_A}/01`, `${STAT_C}/01`]);
  });

  test("chgerTypes 필터는 급속만 남긴다", async () => {
    const { rows } = await selectChargersInBbox(pool, {
      ...WIDE_BBOX,
      chgerTypes: ["04"],
    });
    const keys = rows.map((r) => `${r.statId}/${r.chgerId}`).sort();

    expect(keys).toEqual([`${STAT_B}/01`, `${STAT_C}/01`]);
  });

  test("stats 필터는 충전중만 남긴다", async () => {
    const { rows } = await selectChargersInBbox(pool, { ...WIDE_BBOX, stats: [3] });
    const keys = rows.map((r) => `${r.statId}/${r.chgerId}`).sort();

    expect(keys).toEqual([`${STAT_B}/01`, `${STAT_C}/01`]);
  });

  test("zcode+chgerTypes 조합 필터", async () => {
    const { rows } = await selectChargersInBbox(pool, {
      ...WIDE_BBOX,
      zcode: "11",
      chgerTypes: ["04"],
    });
    const keys = rows.map((r) => `${r.statId}/${r.chgerId}`).sort();

    expect(keys).toEqual([`${STAT_C}/01`]);
  });

  test("아무 것도 걸리지 않으면 빈 배열", async () => {
    const { rows, truncated } = await selectChargersInBbox(pool, EMPTY_BBOX);

    expect(rows).toEqual([]);
    expect(truncated).toBe(false);
  });

  test("limit을 넘으면 초과분은 잘리고 truncated=true", async () => {
    const { rows, truncated } = await selectChargersInBbox(pool, {
      ...SEOUL_BBOX,
      limit: 1,
    });

    expect(rows).toHaveLength(1);
    expect(truncated).toBe(true);
  });

  test("del_yn=true(철거된 충전기)인 충전기는 결과에서 제외된다", async () => {
    const statId = "TEST_BBOX_DELYN";
    await pool.query(
      "INSERT INTO stations (stat_id, name, lat, lng, zcode) VALUES ($1, 'D', 37.55, 127.05, '11') ON CONFLICT (stat_id) DO NOTHING",
      [statId],
    );
    await pool.query(
      "INSERT INTO chargers (stat_id, chger_id, chger_type, del_yn) VALUES ($1, '01', '02', true) ON CONFLICT (stat_id, chger_id) DO NOTHING",
      [statId],
    );
    await pool.query(
      "INSERT INTO charger_status (stat_id, chger_id, stat, seen_at) VALUES ($1, '01', 2, now()) ON CONFLICT (stat_id, chger_id) DO NOTHING",
      [statId],
    );

    try {
      const { rows } = await selectChargersInBbox(pool, SEOUL_BBOX);
      expect(rows.some((r) => r.statId === statId)).toBe(false);
    } finally {
      await pool.query("DELETE FROM charger_status WHERE stat_id = $1", [statId]);
      await pool.query("DELETE FROM chargers WHERE stat_id = $1", [statId]);
      await pool.query("DELETE FROM stations WHERE stat_id = $1", [statId]);
    }
  });

  test("반환된 row는 station/charger/status 필드를 전부 담는다", async () => {
    const { rows } = await selectChargersInBbox(pool, { ...SEOUL_BBOX, zcode: "11" });
    const a = rows.find((r) => r.statId === STAT_A && r.chgerId === "01");

    expect(a).toMatchObject({
      statId: STAT_A,
      chgerId: "01",
      name: "A",
      addr: null,
      lat: 37.5,
      lng: 127.0,
      zcode: "11",
      chgerType: "02",
      stat: 2,
    });
  });
});
