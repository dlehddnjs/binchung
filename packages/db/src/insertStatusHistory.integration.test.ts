import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { insertStatusHistory } from "./insertStatusHistory.js";
import type { StatusHistoryRow } from "./types.js";

const databaseUrl = process.env.DATABASE_URL;
const parentStatId = "TEST_INSERT_HISTORY_PARENT";

describe.skipIf(!databaseUrl)("insertStatusHistory", () => {
  const pool = new Pool({ connectionString: databaseUrl });

  beforeAll(async () => {
    await pool.query(
      "INSERT INTO stations (stat_id, name, lat, lng, zcode) VALUES ($1, 'parent', 37.5, 127.0, '11') ON CONFLICT (stat_id) DO NOTHING",
      [parentStatId],
    );
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM status_history WHERE stat_id = $1", [parentStatId]);
  });

  afterAll(async () => {
    await pool.query("DELETE FROM status_history WHERE stat_id = $1", [parentStatId]);
    await pool.query("DELETE FROM stations WHERE stat_id = $1", [parentStatId]);
    await pool.end();
  });

  test("신규 충전기(prevStat=null)를 append한다", async () => {
    const rows: StatusHistoryRow[] = [
      { statId: parentStatId, chgerId: "01", prevStat: null, nextStat: 2, statUpdDt: null },
    ];
    await insertStatusHistory(pool, rows);

    const result = await pool.query(
      "SELECT prev_stat, next_stat FROM status_history WHERE stat_id = $1 AND chger_id = $2",
      [parentStatId, "01"],
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.prev_stat).toBeNull();
    expect(result.rows[0]?.next_stat).toBe(2);
  });

  test("같은 (stat_id, chger_id)로 여러 번 insert해도 append-only라 누적된다 (덮어쓰지 않음)", async () => {
    await insertStatusHistory(pool, [
      { statId: parentStatId, chgerId: "02", prevStat: 2, nextStat: 3, statUpdDt: null },
    ]);
    await insertStatusHistory(pool, [
      { statId: parentStatId, chgerId: "02", prevStat: 3, nextStat: 2, statUpdDt: null },
    ]);

    const result = await pool.query(
      "SELECT prev_stat, next_stat FROM status_history WHERE stat_id = $1 AND chger_id = $2 ORDER BY id",
      [parentStatId, "02"],
    );
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ prev_stat: 2, next_stat: 3 });
    expect(result.rows[1]).toMatchObject({ prev_stat: 3, next_stat: 2 });
  });

  test("빈 배열이면 아무것도 하지 않는다", async () => {
    await expect(insertStatusHistory(pool, [])).resolves.not.toThrow();
  });
});
