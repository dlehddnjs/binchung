import type { ChargerMapRow } from "@binchung/db";
import type { BboxLngLat } from "../map/bboxExtent";

export interface ChargersFeedParams {
  bbox: BboxLngLat;
  zcode?: string;
  chgerType?: "fast" | "slow";
  stat?: "waiting" | "charging" | "other";
}

export interface ChargersFeedInitialData {
  chargers: ChargerMapRow[];
  truncated: boolean;
}

export interface ChargersFeedState {
  chargers: ChargerMapRow[];
  truncated: boolean;
  status: "loading" | "success" | "error";
  error: Error | null;
  isFetching: boolean;
}

export type UseChargersFeed = (
  params: ChargersFeedParams,
  options?: { initialData?: ChargersFeedInitialData },
) => ChargersFeedState;
