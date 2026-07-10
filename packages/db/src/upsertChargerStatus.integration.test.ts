import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { upsertChargerStatus } from "./upsertChargerStatus.js";
import type { ChargerStatusRow } from "./types.js";

const databaseUrl = process.env.DATABASE_URL;
const parentStatId = "TEST_STATUS_PARENT";

describe.skipIf(!databaseUrl)("upsertChargerStatus", () => {
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

  test("새 상태를 insert하고 seen_at을 채운다", async () => {
    const rows: ChargerStatusRow[] = [
      { statId: parentStatId, chgerId: "01", stat: 2, statUpdDt: new Date("2026-01-01T00:00:00Z") },
    ];
    await upsertChargerStatus(pool, rows);

    const result = await pool.query(
      "SELECT stat, stat_upd_dt, seen_at FROM charger_status WHERE stat_id = $1 AND chger_id = $2",
      [parentStatId, "01"],
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.stat).toBe(2);
    expect(result.rows[0]?.seen_at).not.toBeNull();
  });

  test("같은 키로 다시 upsert하면 stat과 seen_at이 갱신된다", async () => {
    await upsertChargerStatus(pool, [
      { statId: parentStatId, chgerId: "02", stat: 2, statUpdDt: null },
    ]);
    const first = await pool.query(
      "SELECT seen_at FROM charger_status WHERE stat_id = $1 AND chger_id = $2",
      [parentStatId, "02"],
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    await upsertChargerStatus(pool, [
      { statId: parentStatId, chgerId: "02", stat: 3, statUpdDt: null },
    ]);
    const second = await pool.query(
      "SELECT stat, seen_at FROM charger_status WHERE stat_id = $1 AND chger_id = $2",
      [parentStatId, "02"],
    );

    expect(second.rows).toHaveLength(1);
    expect(second.rows[0]?.stat).toBe(3);
    expect(new Date(second.rows[0]?.seen_at).getTime()).toBeGreaterThan(
      new Date(first.rows[0]?.seen_at).getTime(),
    );
  });

  test("빈 배열이면 아무것도 하지 않는다", async () => {
    await expect(upsertChargerStatus(pool, [])).resolves.not.toThrow();
  });

  test("같은 배치 안에 같은 키가 두 번 들어와도 에러 없이 마지막 값으로 upsert된다", async () => {
    await expect(
      upsertChargerStatus(pool, [
        { statId: parentStatId, chgerId: "03", stat: 2, statUpdDt: null },
        { statId: parentStatId, chgerId: "03", stat: 3, statUpdDt: null },
      ]),
    ).resolves.not.toThrow();

    const result = await pool.query(
      "SELECT stat FROM charger_status WHERE stat_id = $1 AND chger_id = $2",
      [parentStatId, "03"],
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.stat).toBe(3);
  });
});
