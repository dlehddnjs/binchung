import { buildChargersQueryString } from "./buildChargersQueryString";
import type { ChargersFeedParams } from "./chargersFeedTypes";

export function chargersQueryKey(params: ChargersFeedParams): readonly [string, string] {
  return ["chargers", buildChargersQueryString(params)] as const;
}
