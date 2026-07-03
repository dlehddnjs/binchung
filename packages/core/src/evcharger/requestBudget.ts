const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function kstDateString(date: Date): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface RequestBudgetOptions {
  dailyLimit?: number;
  warnRatio?: number;
  now?: () => Date;
}

export interface RequestBudgetSnapshot {
  date: string;
  count: number;
  dailyLimit: number;
  ratio: number;
  throttled: boolean;
  exhausted: boolean;
}

export interface RequestBudget {
  canRequest(): boolean;
  recordRequest(): void;
  snapshot(): RequestBudgetSnapshot;
}

export function createRequestBudget(options: RequestBudgetOptions = {}): RequestBudget {
  const dailyLimit = options.dailyLimit ?? 1000;
  const warnRatio = options.warnRatio ?? 0.9;
  const now = options.now ?? (() => new Date());

  let date = kstDateString(now());
  let count = 0;

  function rollover(): void {
    const currentDate = kstDateString(now());
    if (currentDate !== date) {
      date = currentDate;
      count = 0;
    }
  }

  return {
    canRequest(): boolean {
      rollover();
      return count < dailyLimit;
    },
    recordRequest(): void {
      rollover();
      count += 1;
    },
    snapshot(): RequestBudgetSnapshot {
      rollover();
      const ratio = count / dailyLimit;
      return {
        date,
        count,
        dailyLimit,
        ratio,
        throttled: ratio >= warnRatio,
        exhausted: count >= dailyLimit,
      };
    },
  };
}
