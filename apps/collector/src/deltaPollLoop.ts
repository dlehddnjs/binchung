import type { RequestBudget } from "@binchung/core";

export interface DeltaPollLoopDeps {
  tick: () => Promise<unknown>;
  budget: RequestBudget;
  logger?: Pick<Console, "info" | "warn" | "error">;
  normalIntervalMs?: number;
  throttledIntervalMs?: number;
}

export interface DeltaPollLoopHandle {
  /** 진행 중인 tick이 있으면 그게 끝날 때까지 기다린 뒤 resolve된다. */
  stop(): Promise<void>;
}

const DEFAULT_NORMAL_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_THROTTLED_INTERVAL_MS = 10 * 60 * 1000;

export function startDeltaPollLoop(deps: DeltaPollLoopDeps): DeltaPollLoopHandle {
  const normalIntervalMs = deps.normalIntervalMs ?? DEFAULT_NORMAL_INTERVAL_MS;
  const throttledIntervalMs = deps.throttledIntervalMs ?? DEFAULT_THROTTLED_INTERVAL_MS;
  const logger = deps.logger ?? console;

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // 진행 중인 tick의 Promise — stop()이 pool.end() 전에 이 tick의 DB 쓰기가
  // 끝나길 기다릴 수 있게 추적한다.
  let currentTick: Promise<void> | null = null;

  async function tickAndSchedule(): Promise<void> {
    if (stopped) return;

    const tickPromise = (async () => {
      try {
        await deps.tick();
      } catch (error) {
        logger.error("델타 폴링 tick에서 예기치 못한 에러:", error);
      }
    })();
    currentTick = tickPromise;
    await tickPromise;
    currentTick = null;

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
    stop(): Promise<void> {
      stopped = true;
      if (timer) clearTimeout(timer);
      return currentTick ?? Promise.resolve();
    },
  };
}
