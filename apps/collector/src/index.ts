import { createRequestBudget } from "@binchung/core";
import { createPool } from "@binchung/db";
import { createFixturesChargerInfoSource } from "./chargerInfoSource.fixtures.js";
import { createLiveChargerInfoSource } from "./chargerInfoSource.live.js";
import { runFullSync } from "./fullSync.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경변수 ${name}가 필요합니다`);
  }
  return value;
}

async function main(): Promise<void> {
  const mode = process.env.COLLECTOR_MODE === "live" ? "live" : "fixtures";
  const source =
    mode === "live"
      ? createLiveChargerInfoSource({ serviceKey: requireEnv("EVCHARGER_API_KEY") })
      : createFixturesChargerInfoSource();

  const pool = createPool();
  const budget = createRequestBudget();

  console.log(`collector full sync 시작 (mode=${mode})`);
  const result = await runFullSync({ source, pool, budget });
  console.log("full sync 결과:", result);

  await pool.end();
  process.exitCode = result.completed ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error("full sync 실패:", error);
  process.exitCode = 1;
});
