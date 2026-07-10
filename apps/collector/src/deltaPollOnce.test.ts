import { createRequestBudget } from "@binchung/core";
import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import type { ChargerStatusSource } from "./chargerStatusSource.js";
import { createFixturesChargerStatusSource } from "./chargerStatusSource.fixtures.js";
import { runDeltaPollOnce } from "./deltaPollOnce.js";

function createFakePool(selectResult: unknown[] = []): { pool: Pool; queryCalls: unknown[][] } {
  const queryCalls: unknown[][] = [];
  const pool = {
    query: vi.fn(async (...args: unknown[]) => {
      queryCalls.push(args);
      const sql = String(args[0]);
      if (sql.includes("SELECT stat_id, chger_id, stat")) {
        return { rows: selectResult };
      }
      return { rows: [] };
    }),
  } as unknown as Pool;
  return { pool, queryCalls };
}

describe("runDeltaPollOnce", () => {
  it("fixtures 모드로 델타를 가져와 diff 후 적재하고 완료한다", async () => {
    const { pool, queryCalls } = createFakePool();
    const source = createFixturesChargerStatusSource();
    const budget = createRequestBudget();

    const result = await runDeltaPollOnce({ source, pool, budget });

    expect(result.completed).toBe(true);
    expect(result.incomingCount).toBe(10);
    // current가 비어있으니(가짜 select가 빈 배열) 전부 new로 분류됨
    expect(result.newCount).toBe(10);
    expect(result.changedCount).toBe(0);
    expect(result.unchangedCount).toBe(0);
    expect(queryCalls.length).toBeGreaterThan(0);
  });

  it("예산이 이미 소진된 상태면 budget_exhausted로 즉시 멈춘다", async () => {
    const { pool } = createFakePool();
    const source = createFixturesChargerStatusSource();
    const budget = createRequestBudget({ dailyLimit: 1 });
    budget.recordRequest();

    const result = await runDeltaPollOnce({ source, pool, budget });

    expect(result).toMatchObject({ completed: false, stoppedReason: "budget_exhausted", incomingCount: 0 });
  });

  it("페이지 안에 skip되는 항목이 있어 numOfRows보다 파싱된 개수가 적어도, 원본 행 수가 꽉 찼으면 다음 페이지를 마저 가져온다", async () => {
    const { pool } = createFakePool();
    const page1 = `<?xml version="1.0" encoding="UTF-8"?><response><header><resultCode>00</resultCode><resultMsg>OK</resultMsg><totalCount>2</totalCount><pageNo>1</pageNo><numOfRows>2</numOfRows></header><body><items>
<item><statId>P1_A</statId><chgerId>01</chgerId><stat>2</stat><statUpdDt>20260101000000</statUpdDt></item>
<item><chgerId>02</chgerId><stat>2</stat><statUpdDt>20260101000000</statUpdDt></item>
</items></body></response>`;
    const page2 = `<?xml version="1.0" encoding="UTF-8"?><response><header><resultCode>00</resultCode><resultMsg>OK</resultMsg><totalCount>1</totalCount><pageNo>2</pageNo><numOfRows>2</numOfRows></header><body><items>
<item><statId>P1_C</statId><chgerId>01</chgerId><stat>2</stat><statUpdDt>20260101000000</statUpdDt></item>
</items></body></response>`;
    const source: ChargerStatusSource = {
      fetchPage: vi.fn(async ({ pageNo }) => (pageNo === 1 ? page1 : page2)),
    };
    const budget = createRequestBudget();

    const result = await runDeltaPollOnce({ source, pool, budget, numOfRows: 2 });

    // page1은 2건 요청에 1건만 파싱 성공(1건은 statId 누락으로 skip)했지만,
    // 원본 행 수(2)는 numOfRows(2)만큼 꽉 찼으므로 page2까지 이어서 가져와야 한다.
    expect(result).toMatchObject({ completed: true, pagesFetched: 2, incomingCount: 2 });
  });

  it("fetch가 계속 실패하면 fetch_failed로 부분 완료를 보고한다", async () => {
    const { pool } = createFakePool();
    const failingSource: ChargerStatusSource = {
      fetchPage: vi.fn().mockRejectedValue(new Error("network fail")),
    };
    const budget = createRequestBudget();

    const result = await runDeltaPollOnce({
      source: failingSource,
      pool,
      budget,
      maxAttempts: 1,
      sleep: async () => {},
    });

    expect(result).toMatchObject({ completed: false, stoppedReason: "fetch_failed" });
  });
});
