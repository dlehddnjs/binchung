import { parseChargerInfoResponse, type RequestBudget } from "@binchung/core";
import { upsertChargers, upsertStations } from "@binchung/db";
import type { Pool } from "pg";
import type { ChargerInfoSource } from "./chargerInfoSource.js";
import { fetchWithRetry } from "./fetchWithRetry.js";
import { mapChargerInfoItems } from "./mapChargerInfoItems.js";

export interface FullSyncDeps {
  source: ChargerInfoSource;
  pool: Pool;
  budget: RequestBudget;
  logger?: Pick<Console, "info" | "warn" | "error">;
  numOfRows?: number;
  zcodeList?: (string | undefined)[];
  maxAttempts?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export interface FullSyncResult {
  pagesFetched: number;
  stationsUpserted: number;
  chargersUpserted: number;
  completed: boolean;
  stoppedReason?: "budget_exhausted" | "fetch_failed" | "parse_failed";
}

const DEFAULT_NUM_OF_ROWS = 9999;

export async function runFullSync(deps: FullSyncDeps): Promise<FullSyncResult> {
  const numOfRows = deps.numOfRows ?? DEFAULT_NUM_OF_ROWS;
  const zcodeList = deps.zcodeList ?? [undefined];
  const logger = deps.logger ?? console;

  let pagesFetched = 0;
  let stationsUpserted = 0;
  let chargersUpserted = 0;

  for (const zcode of zcodeList) {
    let pageNo = 1;

    while (true) {
      const fetchResult = await fetchWithRetry(
        () => deps.source.fetchPage({ pageNo, numOfRows, zcode }),
        {
          budget: deps.budget,
          maxAttempts: deps.maxAttempts,
          baseDelayMs: deps.baseDelayMs,
          timeoutMs: deps.timeoutMs,
          sleep: deps.sleep,
        },
      );

      if (!fetchResult.ok) {
        const stoppedReason =
          fetchResult.reason === "budget_exhausted" ? "budget_exhausted" : "fetch_failed";
        logger.error(`full sync 중단 (zcode=${zcode ?? "전국"}, page=${pageNo}): ${fetchResult.reason}`);
        return { pagesFetched, stationsUpserted, chargersUpserted, completed: false, stoppedReason };
      }

      const parseResult = parseChargerInfoResponse(fetchResult.value);
      if (!parseResult.ok) {
        logger.error(`파싱 실패 (zcode=${zcode ?? "전국"}, page=${pageNo}): ${parseResult.error.type}`);
        return {
          pagesFetched,
          stationsUpserted,
          chargersUpserted,
          completed: false,
          stoppedReason: "parse_failed",
        };
      }

      pagesFetched += 1;

      const { stations, chargers } = mapChargerInfoItems(parseResult.items);
      await upsertStations(deps.pool, stations);
      await upsertChargers(deps.pool, chargers);
      stationsUpserted += stations.length;
      chargersUpserted += chargers.length;

      logger.info(
        `zcode=${zcode ?? "전국"} page=${pageNo}: ${parseResult.items.length}건 처리 (skipped=${parseResult.skipped.length})`,
      );

      if (parseResult.items.length + parseResult.skipped.length < numOfRows) {
        break;
      }
      pageNo += 1;
    }
  }

  return { pagesFetched, stationsUpserted, chargersUpserted, completed: true };
}
