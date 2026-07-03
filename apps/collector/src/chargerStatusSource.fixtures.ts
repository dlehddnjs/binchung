import { readFileSync } from "node:fs";
import path from "node:path";
import type { ChargerStatusSource, FetchStatusPageParams } from "./chargerStatusSource.js";

const DEFAULT_FIXTURES_DIR = path.join(import.meta.dirname, "../../../fixtures");

export function createFixturesChargerStatusSource(
  fixturesDir = DEFAULT_FIXTURES_DIR,
): ChargerStatusSource {
  return {
    async fetchPage(params: FetchStatusPageParams): Promise<string> {
      const file = params.pageNo === 1 ? "getChargerStatus-nozcode.xml" : "getChargerStatus-empty.xml";
      return readFileSync(path.join(fixturesDir, file), "utf-8");
    },
  };
}
