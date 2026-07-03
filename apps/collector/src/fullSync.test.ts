import { createRequestBudget } from "@binchung/core";
import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import type { ChargerInfoSource } from "./chargerInfoSource.js";
import { createFixturesChargerInfoSource } from "./chargerInfoSource.fixtures.js";
import { runFullSync } from "./fullSync.js";

function createFakePool(): { pool: Pool; queryCalls: unknown[][] } {
  const queryCalls: unknown[][] = [];
  const pool = {
    query: vi.fn(async (...args: unknown[]) => {
      queryCalls.push(args);
      return { rows: [] };
    }),
  } as unknown as Pool;
  return { pool, queryCalls };
}

describe("runFullSync", () => {
  it("fixtures 모드로 1페이지(10건)를 가져와 upsert 쿼리를 실행하고 완료한다", async () => {
    const { pool, queryCalls } = createFakePool();
    const source = createFixturesChargerInfoSource();
    const budget = createRequestBudget();

    const result = await runFullSync({ source, pool, budget });

    expect(result).toMatchObject({
      completed: true,
      pagesFetched: 1,
      stationsUpserted: 8, // getChargerInfo-normal.xml: 10건 중 2개 충전소가 충전기 2대씩(중복 statId) → 고유 station 8개
      chargersUpserted: 10,
    });
    expect(queryCalls.length).toBeGreaterThan(0);
  });

  it("예산이 이미 소진된 상태면 아무 것도 안 하고 budget_exhausted로 즉시 멈춘다", async () => {
    const { pool } = createFakePool();
    const source = createFixturesChargerInfoSource();
    const budget = createRequestBudget({ dailyLimit: 1 });
    budget.recordRequest();

    const result = await runFullSync({ source, pool, budget });

    expect(result).toMatchObject({
      completed: false,
      stoppedReason: "budget_exhausted",
      pagesFetched: 0,
    });
  });

  it("fetch가 계속 실패하면 fetch_failed로 부분 완료를 보고한다", async () => {
    const { pool } = createFakePool();
    const failingSource: ChargerInfoSource = {
      fetchPage: vi.fn().mockRejectedValue(new Error("network fail")),
    };
    const budget = createRequestBudget();

    const result = await runFullSync({
      source: failingSource,
      pool,
      budget,
      maxAttempts: 1,
      sleep: async () => {},
    });

    expect(result).toMatchObject({ completed: false, stoppedReason: "fetch_failed", pagesFetched: 0 });
  });
});
