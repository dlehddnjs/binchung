import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { closePool } from "../../../lib/db.js";
import { GET } from "./route.js";

const databaseUrl = process.env.DATABASE_URL;
const STAT_ID = "TEST_ROUTE_CHARGERS";

describe.skipIf(!databaseUrl)("GET /api/chargers (route wiring smoke test)", () => {
  const pool = new Pool({ connectionString: databaseUrl });

  beforeAll(async () => {
    await pool.query(
      "INSERT INTO stations (stat_id, name, lat, lng, zcode) VALUES ($1, '라우트테스트', 37.5, 127.0, '11') ON CONFLICT (stat_id) DO NOTHING",
      [STAT_ID],
    );
    await pool.query(
      "INSERT INTO chargers (stat_id, chger_id, chger_type) VALUES ($1, '01', '04') ON CONFLICT (stat_id, chger_id) DO NOTHING",
      [STAT_ID],
    );
    await pool.query(
      "INSERT INTO charger_status (stat_id, chger_id, stat, seen_at) VALUES ($1, '01', 2, now()) ON CONFLICT (stat_id, chger_id) DO NOTHING",
      [STAT_ID],
    );
  });

  afterAll(async () => {
    await pool.query("DELETE FROM charger_status WHERE stat_id = $1", [STAT_ID]);
    await pool.query("DELETE FROM chargers WHERE stat_id = $1", [STAT_ID]);
    await pool.query("DELETE FROM stations WHERE stat_id = $1", [STAT_ID]);
    await pool.end();
    await closePool(); // GET이 내부적으로 사용한 lib/db.ts 싱글톤 풀도 정리
  });

  test("실제 싱글톤 풀을 통해 bbox 조회가 끝까지 동작한다", async () => {
    const request = new Request(
      "http://localhost/api/chargers?bbox=126.9,37.4,127.2,37.7",
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.chargers.some((c: { statId: string }) => c.statId === STAT_ID)).toBe(true);
  });

  test("bbox 누락 시 400", async () => {
    const response = await GET(new Request("http://localhost/api/chargers"));
    expect(response.status).toBe(400);
  });
});
