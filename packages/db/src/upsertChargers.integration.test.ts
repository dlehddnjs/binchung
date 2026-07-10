import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { upsertChargers } from "./upsertChargers.js";
import type { ChargerRow } from "./types.js";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("upsertChargers", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const parentStatId = "TEST_CHARGER_PARENT";

  beforeAll(async () => {
    await pool.query(
      "INSERT INTO stations (stat_id, name, lat, lng, zcode) VALUES ($1, 'parent', 37.5, 127.0, '11') ON CONFLICT (stat_id) DO NOTHING",
      [parentStatId],
    );
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM chargers WHERE stat_id = $1", [parentStatId]);
  });

  afterAll(async () => {
    await pool.query("DELETE FROM chargers WHERE stat_id = $1", [parentStatId]);
    await pool.query("DELETE FROM stations WHERE stat_id = $1", [parentStatId]);
    await pool.end();
  });

  test("새 charger를 insert한다", async () => {
    const rows: ChargerRow[] = [
      { statId: parentStatId, chgerId: "01", chgerType: "06", outputKw: 50 },
    ];
    await upsertChargers(pool, rows);

    const result = await pool.query(
      "SELECT * FROM chargers WHERE stat_id = $1 AND chger_id = $2",
      [parentStatId, "01"],
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ chger_type: "06" });
  });

  test("같은 (stat_id, chger_id)로 다시 upsert하면 덮어쓴다", async () => {
    await upsertChargers(pool, [{ statId: parentStatId, chgerId: "02", chgerType: "01", outputKw: null }]);
    await upsertChargers(pool, [{ statId: parentStatId, chgerId: "02", chgerType: "02", outputKw: 7 }]);

    const result = await pool.query(
      "SELECT * FROM chargers WHERE stat_id = $1 AND chger_id = $2",
      [parentStatId, "02"],
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.chger_type).toBe("02");
    expect(Number(result.rows[0]?.output_kw)).toBe(7);
  });

  test("빈 배열이면 아무것도 하지 않는다", async () => {
    await expect(upsertChargers(pool, [])).resolves.not.toThrow();
  });
});
