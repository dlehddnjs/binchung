import type { RequestBudget } from "@binchung/core";

export interface FetchWithRetryOptions {
  budget: RequestBudget;
  timeoutMs?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export type FetchWithRetryResult<T> =
  | { ok: true; value: T; attempts: number }
  | {
      ok: false;
      reason: "budget_exhausted" | "max_attempts_exceeded";
      attempts: number;
      lastError?: unknown;
    };

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 타임아웃 시 진행 중인 요청을 실제로 취소(abort)한다 — 그냥 다음 재시도로
// 넘어가기만 하면 이전 요청이 백그라운드에 계속 남아 쌓인다.
function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
  controller: AbortController,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`timeout after ${ms}ms`));
    }, ms);
    fn(controller.signal).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function fetchWithRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: FetchWithRetryOptions,
): Promise<FetchWithRetryResult<T>> {
  const timeoutMs = options.timeoutMs ?? 12000;
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const sleep = options.sleep ?? defaultSleep;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (!options.budget.canRequest()) {
      return { ok: false, reason: "budget_exhausted", attempts: attempt - 1 };
    }

    options.budget.recordRequest();

    try {
      const controller = new AbortController();
      const value = await withTimeout(fn, timeoutMs, controller);
      return { ok: true, value, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(baseDelayMs * 2 ** (attempt - 1));
      }
    }
  }

  return { ok: false, reason: "max_attempts_exceeded", attempts: maxAttempts, lastError };
}
