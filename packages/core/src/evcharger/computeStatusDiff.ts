import { makeChargerKey } from "./chargerKey.js";
import type { ChargerStatusItem, StatusDiffEntry, StatusDiffResult } from "./types.js";

export function computeStatusDiff(
  current: ReadonlyMap<string, number>,
  incoming: ChargerStatusItem[],
): StatusDiffResult {
  const changed: StatusDiffEntry[] = [];
  const unchanged: StatusDiffEntry[] = [];
  const newEntries: StatusDiffEntry[] = [];

  for (const item of incoming) {
    const key = makeChargerKey(item.statId, item.chgerId);
    const prevStat = current.has(key) ? current.get(key)! : null;

    const entry: StatusDiffEntry = {
      statId: item.statId,
      chgerId: item.chgerId,
      prevStat,
      nextStat: item.stat,
      statUpdDt: item.statUpdDt,
    };

    if (prevStat === null) {
      newEntries.push(entry);
    } else if (prevStat === item.stat) {
      unchanged.push(entry);
    } else {
      changed.push(entry);
    }
  }

  return { changed, unchanged, new: newEntries };
}
