import { makeChargerKey } from "./chargerKey.js";

export interface CurrentStatusRow {
  statId: string;
  chgerId: string;
  stat: number;
}

export function buildCurrentStatusMap(rows: CurrentStatusRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(makeChargerKey(row.statId, row.chgerId), row.stat);
  }
  return map;
}
