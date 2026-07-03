import type { RequestBudget } from "@binchung/core";

export interface DeltaPollLoopDeps {
  tick: () => Promise<unknown>;
  budget: RequestBudget;
  logger?: Pick<Console, "info" | "warn" | "error">;
  normalIntervalMs?: number;
  throttledIntervalMs?: number;
}

export interface DeltaPollLoopHandle {
  stop(): void;
}

const DEFAULT_NORMAL_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_THROTTLED_INTERVAL_MS = 10 * 60 * 1000;

export function startDeltaPollLoop(deps: DeltaPollLoopDeps): DeltaPollLoopHandle {
  const normalIntervalMs = deps.normalIntervalMs ?? DEFAULT_NORMAL_INTERVAL_MS;
  const throttledIntervalMs = deps.throttledIntervalMs ?? DEFAULT_THROTTLED_INTERVAL_MS;
  const logger = deps.logger ?? console;

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function tickAndSchedule(): Promise<void> {
    if (stopped) return;

    try {
      await deps.tick();
    } catch (error) {
      logger.error("델타 폴링 tick에서 예기치 못한 에러:", error);
    }

    if (stopped) return;

    const throttled = deps.budget.snapshot().throttled;
    const nextDelayMs = throttled ? throttledIntervalMs : normalIntervalMs;
    if (throttled) {
      logger.warn(`예산 90% 도달 — 다음 주기를 ${nextDelayMs}ms 뒤로 완화`);
    }

    timer = setTimeout(() => {
      void tickAndSchedule();
    }, nextDelayMs);
  }

  timer = setTimeout(() => {
    void tickAndSchedule();
  }, 0);

  return {
    stop(): void {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}
