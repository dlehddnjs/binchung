import type { UiChargerStatus } from "./types.js";

const WAITING = new Set([2]);
const CHARGING = new Set([3, 6]);
const OTHER = new Set([0, 1, 4, 5, 9]);

export function mapStatToUiStatus(stat: number): UiChargerStatus {
  if (WAITING.has(stat)) return "waiting";
  if (CHARGING.has(stat)) return "charging";
  if (OTHER.has(stat)) return "other";
  return "unknown";
}
