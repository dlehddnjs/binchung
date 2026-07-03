import { Pool } from "pg";
import { afterAll, describe, expect, test } from "vitest";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("schema smoke test", () => {
  const pool = new Pool({ connectionString: databaseUrl });

  afterAll(async () => {
    await pool.end();
  });

  test("4개 테이블이 마이그레이션으로 생성되어 있다", async () => {
    const tables = ["stations", "chargers", "charger_status", "status_history"];
    for (const table of tables) {
      const result = await pool.query("SELECT to_regclass($1) AS reg", [`public.${table}`]);
      expect(result.rows[0]?.reg, `${table} 테이블이 존재해야 함`).toBe(table);
    }
  });

  test("chargers.stat_id는 stations를 참조하는 FK 제약을 가진다", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO stations (stat_id, name, lat, lng, zcode) VALUES ('SMOKE1', 'test', 37.5, 127.0, '11')",
      );
      await client.query(
        "INSERT INTO chargers (stat_id, chger_id, chger_type) VALUES ('SMOKE1', '01', '01')",
      );

      await expect(
        client.query(
          "INSERT INTO chargers (stat_id, chger_id, chger_type) VALUES ('NONEXISTENT', '01', '01')",
        ),
      ).rejects.toThrow();
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});
