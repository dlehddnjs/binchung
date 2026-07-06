import type { UiChargerStatus } from "@binchung/core";

const COLORS: Record<UiChargerStatus, string> = {
  waiting: "#22c55e",
  charging: "#f97316",
  other: "#9ca3af",
  unknown: "#9ca3af",
};

export function statusColor(status: UiChargerStatus): string {
  return COLORS[status];
}
