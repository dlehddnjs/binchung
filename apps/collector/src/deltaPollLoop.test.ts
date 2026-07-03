import { createRequestBudget } from "@binchung/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startDeltaPollLoop } from "./deltaPollLoop.js";

describe("startDeltaPollLoop", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("정상 상태면 normalIntervalMs 간격으로 tick을 반복 호출한다", async () => {
    const budget = createRequestBudget({ dailyLimit: 1000 });
    const tick = vi.fn().mockResolvedValue(undefined);

    const handle = startDeltaPollLoop({ tick, budget, normalIntervalMs: 1000, throttledIntervalMs: 5000 });

    await vi.advanceTimersByTimeAsync(0);
    expect(tick).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(tick).toHaveBeenCalledTimes(2);

    handle.stop();
  });

  it("예산이 throttled 상태가 되면 다음 간격이 throttledIntervalMs로 늘어난다", async () => {
    const budget = createRequestBudget({ dailyLimit: 10, warnRatio: 0.9 });
    const tick = vi.fn().mockImplementation(async () => {
      for (let i = 0; i < 9; i++) budget.recordRequest();
    });

    const handle = startDeltaPollLoop({ tick, budget, normalIntervalMs: 1000, throttledIntervalMs: 5000 });

    await vi.advanceTimersByTimeAsync(0);
    expect(tick).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(tick).toHaveBeenCalledTimes(1); // 아직 throttledIntervalMs(5000)에 못 미침

    await vi.advanceTimersByTimeAsync(4000);
    expect(tick).toHaveBeenCalledTimes(2);

    handle.stop();
  });

  it("stop() 호출 후에는 더 이상 tick하지 않는다", async () => {
    const budget = createRequestBudget();
    const tick = vi.fn().mockResolvedValue(undefined);

    const handle = startDeltaPollLoop({ tick, budget, normalIntervalMs: 1000 });
    await vi.advanceTimersByTimeAsync(0);
    expect(tick).toHaveBeenCalledTimes(1);

    handle.stop();
    await vi.advanceTimersByTimeAsync(10000);
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it("tick이 예외를 던져도 루프는 죽지 않고 다음 tick으로 이어간다", async () => {
    const budget = createRequestBudget();
    const tick = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(undefined);

    const handle = startDeltaPollLoop({ tick, budget, normalIntervalMs: 1000 });
    await vi.advanceTimersByTimeAsync(0);
    expect(tick).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(tick).toHaveBeenCalledTimes(2);

    handle.stop();
  });
});
