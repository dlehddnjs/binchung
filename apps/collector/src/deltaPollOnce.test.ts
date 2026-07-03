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
