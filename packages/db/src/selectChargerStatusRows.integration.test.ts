import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { selectChargerStatusRows } from "./selectChargerStatusRows.js";

const databaseUrl = process.env.DATABASE_URL;
const parentStatId = "TEST_SELECT_STATUS_PARENT";

describe.skipIf(!databaseUrl)("selectChargerStatusRows", () => {
  const pool = new Pool({ connectionString: databaseUrl });

  beforeAll(async () => {
    await pool.query(
      "INSERT INTO stations (stat_id, name, lat, lng, zcode) VALUES ($1, 'parent', 37.5, 127.0, '11') ON CONFLICT (stat_id) DO NOTHING",
      [parentStatId],
    );
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM charger_status WHERE stat_id = $1", [parentStatId]);
  });

  afterAll(async () => {
    await pool.query("DELETE FROM charger_status WHERE stat_id = $1", [parentStatId]);
    await pool.query("DELETE FROM stations WHERE stat_id = $1", [parentStatId]);
    await pool.end();
  });

  test("빈 keys면 쿼리 없이 빈 배열을 반환한다", async () => {
    expect(await selectChargerStatusRows(pool, [])).toEqual([]);
  });

  test("존재하는 키만 조회되고, 요청한 키 중 없는 건 빠진다", async () => {
    await pool.query(
      "INSERT INTO charger_status (stat_id, chger_id, stat, seen_at) VALUES ($1, '01', 2, now())",
      [parentStatId],
    );

    const rows = await selectChargerStatusRows(pool, [
      { statId: parentStatId, chgerId: "01" },
      { statId: parentStatId, chgerId: "99" }, // 존재하지 않음
    ]);

    expect(rows).toEqual([{ statId: parentStatId, chgerId: "01", stat: 2 }]);
  });
});
