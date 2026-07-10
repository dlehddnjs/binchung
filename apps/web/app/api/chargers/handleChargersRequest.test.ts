import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import { handleChargersRequest } from "./handleChargersRequest";

function createFakePool(rows: unknown[] = []): { pool: Pool; queryCalls: unknown[][] } {
  const queryCalls: unknown[][] = [];
  const pool = {
    query: vi.fn(async (...args: unknown[]) => {
      queryCalls.push(args);
      return { rows };
    }),
  } as unknown as Pool;
  return { pool, queryCalls };
}

describe("handleChargersRequest", () => {
  it("bbox가 없으면 400을 반환하고 DB를 조회하지 않는다", async () => {
    const { pool, queryCalls } = createFakePool();
    const request = new Request("http://localhost/api/chargers");

    const response = await handleChargersRequest(request, { pool });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(queryCalls).toHaveLength(0);
  });

  it("type이 허용값이 아니면 400", async () => {
    const { pool, queryCalls } = createFakePool();
    const request = new Request(
      "http://localhost/api/chargers?bbox=126.9,37.4,127.2,37.7&type=unknown",
    );

    const response = await handleChargersRequest(request, { pool });

    expect(response.status).toBe(400);
    expect(queryCalls).toHaveLength(0);
  });

  it("유효한 쿼리면 200과 {chargers, truncated}를 반환하고 statUpdDt는 문자열로 직렬화된다", async () => {
    const dbRow = {
      stat_id: "ST1",
      chger_id: "01",
      name: "테스트 충전소",
      addr: null,
      lat: 37.5,
      lng: 127.0,
      zcode: "11",
      chger_type: "04",
      stat: 2,
      stat_upd_dt: new Date("2026-07-06T00:00:00.000Z"),
    };
    const { pool, queryCalls } = createFakePool([dbRow]);
    const request = new Request(
      "http://localhost/api/chargers?bbox=126.9,37.4,127.2,37.7&zcode=11&type=fast&stat=waiting",
    );

    const response = await handleChargersRequest(request, { pool });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      truncated: false,
      chargers: [
        {
          statId: "ST1",
          chgerId: "01",
          name: "테스트 충전소",
          addr: null,
          lat: 37.5,
          lng: 127.0,
          zcode: "11",
          chgerType: "04",
          stat: 2,
          statUpdDt: "2026-07-06T00:00:00.000Z",
        },
      ],
    });

    expect(queryCalls).toHaveLength(1);
    const [, sqlParams] = queryCalls[0] as [string, unknown[]];
    expect(sqlParams[0]).toBe(126.9); // minLng
    expect(sqlParams[1]).toBe(127.2); // maxLng
    expect(sqlParams[2]).toBe(37.4); // minLat
    expect(sqlParams[3]).toBe(37.7); // maxLat
    expect(sqlParams[4]).toBe("11"); // zcode
    expect(sqlParams[5]).toEqual(expect.arrayContaining(["04"])); // fast codes
    expect(sqlParams[6]).toEqual([2]); // waiting
  });

  it("DB 조회가 실패하면 던지지 않고 500 + 에러 JSON을 반환한다", async () => {
    const pool = {
      query: vi.fn(async () => {
        throw new Error("connection refused");
      }),
    } as unknown as Pool;
    const request = new Request("http://localhost/api/chargers?bbox=126.9,37.4,127.2,37.7");

    const response = await handleChargersRequest(request, { pool });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});
