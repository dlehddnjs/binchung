import type { UiChargerStatus } from "@binchung/core";

export const uiStatusLabel: Record<UiChargerStatus, string> = {
  waiting: "대기",
  charging: "충전중",
  other: "기타",
  unknown: "기타",
};
