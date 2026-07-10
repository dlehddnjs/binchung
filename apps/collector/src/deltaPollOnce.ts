import {
  buildCurrentStatusMap,
  computeStatusDiff,
  parseChargerStatusResponse,
  type ChargerStatusItem,
  type RequestBudget,
} from "@binchung/core";
import { insertStatusHistory, selectChargerStatusRows, upsertChargerStatus } from "@binchung/db";
import type { Pool } from "pg";
import type { ChargerStatusSource } from "./chargerStatusSource.js";
import { fetchWithRetry } from "./fetchWithRetry.js";
import { mapStatusDiffEntries } from "./mapStatusDiffEntries.js";

export interface DeltaPollDeps {
  source: ChargerStatusSource;
  pool: Pool;
  budget: RequestBudget;
  logger?: Pick<Console, "info" | "warn" | "error">;
  numOfRows?: number;
  period?: number;
  zcode?: string;
  maxPages?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export interface DeltaPollResult {
  pagesFetched: number;
  incomingCount: number;
  changedCount: number;
  unchangedCount: number;
  newCount: number;
  completed: boolean;
  stoppedReason?: "budget_exhausted" | "fetch_failed" | "parse_failed" | "max_pages_exceeded";
}

const DEFAULT_NUM_OF_ROWS = 9999;
const DEFAULT_PERIOD = 5;
const DEFAULT_MAX_PAGES = 5;

export async function runDeltaPollOnce(deps: DeltaPollDeps): Promise<DeltaPollResult> {
  const numOfRows = deps.numOfRows ?? DEFAULT_NUM_OF_ROWS;
  const period = deps.period ?? DEFAULT_PERIOD;
  const maxPages = deps.maxPages ?? DEFAULT_MAX_PAGES;
  const logger = deps.logger ?? console;

  const incoming: ChargerStatusItem[] = [];
  let pagesFetched = 0;
  let pageNo = 1;
  let completed = true;
  let stoppedReason: DeltaPollResult["stoppedReason"];

  while (true) {
    if (pagesFetched >= maxPages) {
      completed = false;
      stoppedReason = "max_pages_exceeded";
      logger.warn(`델타 폴링 maxPages(${maxPages}) 도달 — 이번 tick은 여기까지만 처리`);
      break;
    }

    const fetchResult = await fetchWithRetry(
      (signal) => deps.source.fetchPage({ pageNo, numOfRows, period, zcode: deps.zcode }, signal),
      {
        budget: deps.budget,
        maxAttempts: deps.maxAttempts,
        baseDelayMs: deps.baseDelayMs,
        timeoutMs: deps.timeoutMs,
        sleep: deps.sleep,
      },
    );

    if (!fetchResult.ok) {
      completed = false;
      stoppedReason = fetchResult.reason === "budget_exhausted" ? "budget_exhausted" : "fetch_failed";
      logger.error(`델타 폴링 중단 (page=${pageNo}): ${fetchResult.reason}`);
      break;
    }

    const parseResult = parseChargerStatusResponse(fetchResult.value);
    if (!parseResult.ok) {
      completed = false;
      stoppedReason = "parse_failed";
      logger.error(`델타 파싱 실패 (page=${pageNo}): ${parseResult.error.type}`);
      break;
    }

    pagesFetched += 1;
    incoming.push(...parseResult.items);

    if (parseResult.items.length + parseResult.skipped.length < numOfRows) {
      break;
    }
    pageNo += 1;
  }

  // 페이지 도중 실패해도, 그때까지 이미 받은 페이지의 데이터는 버리지 않고
  // 반드시 diff/적재한다 — completed/stoppedReason으로 부분 완료임만 정직하게 보고.
  if (incoming.length === 0) {
    return {
      pagesFetched,
      incomingCount: 0,
      changedCount: 0,
      unchangedCount: 0,
      newCount: 0,
      completed,
      stoppedReason,
    };
  }

  const keys = incoming.map((item) => ({ statId: item.statId, chgerId: item.chgerId }));
  const currentRows = await selectChargerStatusRows(deps.pool, keys);
  const current = buildCurrentStatusMap(currentRows);

  const diff = computeStatusDiff(current, incoming);
  const { chargerStatusRows, statusHistoryRows } = mapStatusDiffEntries(diff);

  await upsertChargerStatus(deps.pool, chargerStatusRows);
  await insertStatusHistory(deps.pool, statusHistoryRows);

  logger.info(
    `델타 폴링: incoming=${incoming.length} changed=${diff.changed.length} unchanged=${diff.unchanged.length} new=${diff.new.length}`,
  );

  return {
    pagesFetched,
    incomingCount: incoming.length,
    changedCount: diff.changed.length,
    unchangedCount: diff.unchanged.length,
    newCount: diff.new.length,
    completed,
    stoppedReason,
  };
}
