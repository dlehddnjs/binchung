import { Pool } from "pg";
import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { upsertStations } from "./upsertStations.js";
import type { StationRow } from "./types.js";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("upsertStations", () => {
  const pool = new Pool({ connectionString: databaseUrl });

  beforeEach(async () => {
    await pool.query("DELETE FROM stations WHERE stat_id LIKE 'TEST_UPSERT_%'");
  });

  afterAll(async () => {
    await pool.query("DELETE FROM stations WHERE stat_id LIKE 'TEST_UPSERT_%'");
    await pool.end();
  });

  test("새 station을 insert한다", async () => {
    const rows: StationRow[] = [
      {
        statId: "TEST_UPSERT_1",
        name: "테스트 충전소",
        addr: "서울시 어딘가",
        lat: 37.5,
        lng: 127.0,
        zcode: "11",
        useTime: "24시간",
        busiNm: "테스트기관",
      },
    ];
    await upsertStations(pool, rows);

    const result = await pool.query("SELECT * FROM stations WHERE stat_id = $1", ["TEST_UPSERT_1"]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ name: "테스트 충전소", zcode: "11" });
  });

  test("같은 stat_id로 다시 upsert하면 덮어쓰고 중복 생성되지 않는다", async () => {
    const base: StationRow = {
      statId: "TEST_UPSERT_2",
      name: "이름1",
      addr: null,
      lat: 37.0,
      lng: 127.0,
      zcode: "11",
      useTime: null,
      busiNm: null,
    };
    await upsertStations(pool, [base]);
    await upsertStations(pool, [{ ...base, name: "이름2" }]);

    const result = await pool.query("SELECT * FROM stations WHERE stat_id = $1", ["TEST_UPSERT_2"]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.name).toBe("이름2");
  });

  test("빈 배열이면 아무것도 하지 않는다", async () => {
    await expect(upsertStations(pool, [])).resolves.not.toThrow();
  });

  test("chunkSize보다 많은 행도 전부 upsert된다", async () => {
    const rows: StationRow[] = Array.from({ length: 5 }, (_, i) => ({
      statId: `TEST_UPSERT_CHUNK_${i}`,
      name: `station-${i}`,
      addr: null,
      lat: 37.0,
      lng: 127.0,
      zcode: "11",
      useTime: null,
      busiNm: null,
    }));

    await upsertStations(pool, rows, { chunkSize: 2 });

    const result = await pool.query("SELECT count(*) FROM stations WHERE stat_id LIKE 'TEST_UPSERT_CHUNK_%'");
    expect(Number(result.rows[0]?.count)).toBe(5);

    await pool.query("DELETE FROM stations WHERE stat_id LIKE 'TEST_UPSERT_CHUNK_%'");
  });
});
