export { parseChargerInfoResponse } from "./evcharger/parseChargerInfoResponse.js";
export { parseChargerStatusResponse } from "./evcharger/parseChargerStatusResponse.js";
export { mapStatToUiStatus } from "./evcharger/mapStatToUiStatus.js";
export { classifyChargerSpeed } from "./evcharger/classifyChargerSpeed.js";
export { makeChargerKey } from "./evcharger/chargerKey.js";
export { computeStatusDiff } from "./evcharger/computeStatusDiff.js";
export type {
  ChargerInfoItem,
  ChargerSpeed,
  ChargerStatusItem,
  ParseError,
  ParseResult,
  ResponseHeader,
  SkippedItem,
  StatusDiffEntry,
  StatusDiffResult,
  UiChargerStatus,
} from "./evcharger/types.js";
