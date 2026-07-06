import type { UiChargerStatus } from "@binchung/core";

const PRIORITY: UiChargerStatus[] = ["waiting", "charging", "other", "unknown"];

export function dominantUiStatus(statuses: UiChargerStatus[]): UiChargerStatus {
  if (statuses.length === 0) return "unknown";

  const counts = new Map<UiChargerStatus, number>();
  for (const status of statuses) {
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  let best: UiChargerStatus = "unknown";
  let bestCount = -1;
  for (const status of PRIORITY) {
    const count = counts.get(status) ?? 0;
    if (count > bestCount) {
      best = status;
      bestCount = count;
    }
  }
  return best;
}
