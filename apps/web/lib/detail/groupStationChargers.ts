import type { ChargerMapRow } from "@binchung/db";

export interface StationChargersGroup {
  statId: string;
  name: string;
  addr: string | null;
  chargers: ChargerMapRow[];
}

export function groupStationChargers(
  chargers: ChargerMapRow[],
  statId: string | null,
): StationChargersGroup | null {
  if (!statId) return null;

  const matches = chargers.filter((charger) => charger.statId === statId);
  if (matches.length === 0) return null;

  return { statId, name: matches[0].name, addr: matches[0].addr, chargers: matches };
}
