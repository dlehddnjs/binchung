import type { ChargerMapRow } from "@binchung/db";
import { buildChargersQueryString } from "./buildChargersQueryString";
import type { ChargersFeedParams } from "./chargersFeedTypes";

export interface FetchChargersResult {
  chargers: ChargerMapRow[];
  truncated: boolean;
}

export async function fetchChargers(
  params: ChargersFeedParams,
  signal?: AbortSignal,
): Promise<FetchChargersResult> {
  // 클라이언트 전용 훅에서만 호출되므로 window가 항상 존재한다. Node의 전역
  // fetch(undici)는 브라우저와 달리 문서 기준 URL을 몰라 상대경로를 못 받아들이므로
  // window.location.origin으로 명시적으로 절대 URL을 만든다.
  const url = new URL(`/api/chargers?${buildChargersQueryString(params)}`, window.location.origin);

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`/api/chargers ${response.status}`);
  }
  return response.json();
}
