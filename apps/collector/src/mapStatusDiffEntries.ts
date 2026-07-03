import { parseStatUpdDt, type StatusDiffEntry, type StatusDiffResult } from "@binchung/core";
import type { ChargerStatusRow, StatusHistoryRow } from "@binchung/db";

export interface MappedStatusDiff {
  chargerStatusRows: ChargerStatusRow[];
  statusHistoryRows: StatusHistoryRow[];
}

function toChargerStatusRow(entry: StatusDiffEntry): ChargerStatusRow {
  return {
    statId: entry.statId,
    chgerId: entry.chgerId,
    stat: entry.nextStat,
    statUpdDt: parseStatUpdDt(entry.statUpdDt),
  };
}

function toStatusHistoryRow(entry: StatusDiffEntry): StatusHistoryRow {
  return {
    statId: entry.statId,
    chgerId: entry.chgerId,
    prevStat: entry.prevStat,
    nextStat: entry.nextStat,
    statUpdDt: parseStatUpdDt(entry.statUpdDt),
  };
}

export function mapStatusDiffEntries(diff: StatusDiffResult): MappedStatusDiff {
  const chargerStatusRows = [...diff.changed, ...diff.unchanged, ...diff.new].map(toChargerStatusRow);
  const statusHistoryRows = [...diff.changed, ...diff.new].map(toStatusHistoryRow);

  return { chargerStatusRows, statusHistoryRows };
}
