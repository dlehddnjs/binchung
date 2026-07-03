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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    promise.then(
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
  fn: () => Promise<T>,
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
      const value = await withTimeout(fn(), timeoutMs);
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
