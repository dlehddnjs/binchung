import { createRequestBudget } from "@binchung/core";
import { createPool } from "@binchung/db";
import { createFixturesChargerStatusSource } from "./chargerStatusSource.fixtures.js";
import { createLiveChargerStatusSource } from "./chargerStatusSource.live.js";
import { startDeltaPollLoop } from "./deltaPollLoop.js";
import { runDeltaPollOnce } from "./deltaPollOnce.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경변수 ${name}가 필요합니다`);
  }
  return value;
}

const mode = process.env.COLLECTOR_MODE === "live" ? "live" : "fixtures";
const source =
  mode === "live"
    ? createLiveChargerStatusSource({ serviceKey: requireEnv("EVCHARGER_API_KEY") })
    : createFixturesChargerStatusSource();

const pool = createPool();
const budget = createRequestBudget();

console.log(`collector 델타 폴링 루프 시작 (mode=${mode})`);

const handle = startDeltaPollLoop({
  budget,
  tick: async () => {
    const result = await runDeltaPollOnce({ source, pool, budget });
    console.log("delta poll tick 결과:", result);
    return result;
  },
});

function shutdown(signal: string): void {
  console.log(`${signal} 수신 — 델타 폴링 루프 종료 중...`);
  handle
    .stop()
    .then(() => pool.end())
    .catch((error: unknown) => console.error("pool 종료 중 에러:", error))
    .finally(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
