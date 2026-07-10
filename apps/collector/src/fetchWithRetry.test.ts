import { createRequestBudget } from "@binchung/core";
import { describe, expect, it, vi } from "vitest";
import { fetchWithRetry } from "./fetchWithRetry.js";

function noopSleep(): Promise<void> {
  return Promise.resolve();
}

describe("fetchWithRetry", () => {
  it("첫 시도에 성공하면 그대로 반환한다", async () => {
    const budget = createRequestBudget({ dailyLimit: 10 });
    const fn = vi.fn().mockResolvedValue("ok");

    const result = await fetchWithRetry(fn, { budget, sleep: noopSleep });

    expect(result).toEqual({ ok: true, value: "ok", attempts: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("실패 후 재시도해서 성공하면 attempts에 반영된다", async () => {
    const budget = createRequestBudget({ dailyLimit: 10 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail1"))
      .mockResolvedValueOnce("ok");

    const result = await fetchWithRetry(fn, { budget, sleep: noopSleep });

    expect(result).toEqual({ ok: true, value: "ok", attempts: 2 });
  });

  it("maxAttempts를 다 소진하면 실패를 반환한다", async () => {
    const budget = createRequestBudget({ dailyLimit: 10 });
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));

    const result = await fetchWithRetry(fn, { budget, sleep: noopSleep, maxAttempts: 3 });

    expect(result).toMatchObject({ ok: false, reason: "max_attempts_exceeded", attempts: 3 });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("예산이 소진되면 재시도하지 않고 즉시 중단한다", async () => {
    const budget = createRequestBudget({ dailyLimit: 1 });
    budget.recordRequest(); // 이미 소진

    const fn = vi.fn().mockResolvedValue("ok");
    const result = await fetchWithRetry(fn, { budget, sleep: noopSleep });

    expect(result).toEqual({ ok: false, reason: "budget_exhausted", attempts: 0 });
    expect(fn).not.toHaveBeenCalled();
  });

  it("느린 시도는 timeoutMs를 넘기면 실패로 취급하고 재시도한다", async () => {
    const budget = createRequestBudget({ dailyLimit: 10 });
    const fn = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve("too late"), 1000)))
      .mockResolvedValueOnce("ok");

    const result = await fetchWithRetry(fn, { budget, sleep: noopSleep, timeoutMs: 10 });

    expect(result).toEqual({ ok: true, value: "ok", attempts: 2 });
  });

  it("타임아웃되면 fn에 전달된 signal이 abort되어 실제 요청이 취소된다", async () => {
    const budget = createRequestBudget({ dailyLimit: 10 });
    let capturedSignal: AbortSignal | undefined;
    const fn = vi
      .fn()
      .mockImplementationOnce((signal: AbortSignal) => {
        capturedSignal = signal;
        return new Promise(() => {
          // 절대 resolve/reject 되지 않음 — 타임아웃으로만 끝나야 한다.
        });
      })
      .mockResolvedValueOnce("ok");

    const result = await fetchWithRetry(fn, { budget, sleep: noopSleep, timeoutMs: 10 });

    expect(result).toEqual({ ok: true, value: "ok", attempts: 2 });
    expect(capturedSignal?.aborted).toBe(true);
  });

  it("각 재시도 사이에 지수 백오프로 sleep을 호출한다", async () => {
    const budget = createRequestBudget({ dailyLimit: 10 });
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await fetchWithRetry(fn, { budget, sleep, maxAttempts: 3, baseDelayMs: 100 });

    expect(sleep).toHaveBeenNthCalledWith(1, 100);
    expect(sleep).toHaveBeenNthCalledWith(2, 200);
  });
});
