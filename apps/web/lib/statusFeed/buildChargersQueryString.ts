import { bboxLngLatToQueryParam } from "../map/bboxExtent";
import type { ChargersFeedParams } from "./chargersFeedTypes";

export function buildChargersQueryString(params: ChargersFeedParams): string {
  const searchParams = new URLSearchParams();
  searchParams.set("bbox", bboxLngLatToQueryParam(params.bbox));
  if (params.zcode) searchParams.set("zcode", params.zcode);
  if (params.chgerType) searchParams.set("type", params.chgerType);
  if (params.stat) searchParams.set("stat", params.stat);
  return searchParams.toString();
}
