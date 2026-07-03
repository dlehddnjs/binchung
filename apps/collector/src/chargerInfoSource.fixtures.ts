import { readFileSync } from "node:fs";
import path from "node:path";
import type { ChargerInfoSource, FetchPageParams } from "./chargerInfoSource.js";

const DEFAULT_FIXTURES_DIR = path.join(import.meta.dirname, "../../../fixtures");

export function createFixturesChargerInfoSource(fixturesDir = DEFAULT_FIXTURES_DIR): ChargerInfoSource {
  return {
    async fetchPage(params: FetchPageParams): Promise<string> {
      const file = params.pageNo === 1 ? "getChargerInfo-normal.xml" : "getChargerInfo-empty.xml";
      return readFileSync(path.join(fixturesDir, file), "utf-8");
    },
  };
}
