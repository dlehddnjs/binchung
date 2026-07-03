import { describe, expect, it } from "vitest";
import { createRequestBudget } from "./requestBudget.js";

describe("createRequestBudget", () => {
  it("초기 상태는 count=0, throttled/exhausted 모두 false다", () => {
    const budget = createRequestBudget({ dailyLimit: 10 });
    expect(budget.canRequest()).toBe(true);
    expect(budget.snapshot()).toMatchObject({ count: 0, throttled: false, exhausted: false });
  });

  it("recordRequest 호출마다 count가 증가한다", () => {
    const budget = createRequestBudget({ dailyLimit: 10 });
    budget.recordRequest();
    budget.recordRequest();
    expect(budget.snapshot().count).toBe(2);
  });

  it("90%(warnRatio) 도달 시 throttled=true, exhausted는 아직 false다", () => {
    const budget = createRequestBudget({ dailyLimit: 10, warnRatio: 0.9 });
    for (let i = 0; i < 9; i++) budget.recordRequest();
    const snap = budget.snapshot();
    expect(snap.throttled).toBe(true);
    expect(snap.exhausted).toBe(false);
    expect(budget.canRequest()).toBe(true);
  });

  it("100% 도달 시 exhausted=true, canRequest는 false다", () => {
    const budget = createRequestBudget({ dailyLimit: 10 });
    for (let i = 0; i < 10; i++) budget.recordRequest();
    expect(budget.snapshot().exhausted).toBe(true);
    expect(budget.canRequest()).toBe(false);
  });

  it("KST 자정을 넘으면 count가 리셋된다", () => {
    let current = new Date("2026-01-01T14:59:00Z"); // KST 2026-01-01 23:59
    const budget = createRequestBudget({ dailyLimit: 10, now: () => current });
    budget.recordRequest();
    budget.recordRequest();
    expect(budget.snapshot()).toMatchObject({ date: "2026-01-01", count: 2 });

    current = new Date("2026-01-01T15:00:00Z"); // KST 2026-01-02 00:00 (자정 경계)
    expect(budget.snapshot()).toMatchObject({ date: "2026-01-02", count: 0 });
  });

  it("자정 전에는 리셋되지 않는다 (경계값 확인)", () => {
    let current = new Date("2026-01-01T00:00:00Z"); // KST 2026-01-01 09:00
    const budget = createRequestBudget({ dailyLimit: 10, now: () => current });
    budget.recordRequest();

    current = new Date("2026-01-01T14:59:59Z"); // KST 2026-01-01 23:59:59, 아직 같은 날
    expect(budget.snapshot()).toMatchObject({ date: "2026-01-01", count: 1 });
  });
});
