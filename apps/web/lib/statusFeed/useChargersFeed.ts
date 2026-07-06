"use client";

import { useQuery } from "@tanstack/react-query";
import { chargersQueryKey } from "./chargersQueryKey";
import type { ChargersFeedParams, ChargersFeedState, UseChargersFeed } from "./chargersFeedTypes";
import { fetchChargers } from "./fetchChargers";

const POLL_INTERVAL_MS = 60_000;

export const useChargersFeed: UseChargersFeed = (
  params: ChargersFeedParams,
  options,
): ChargersFeedState => {
  const query = useQuery({
    queryKey: chargersQueryKey(params),
    queryFn: ({ signal }) => fetchChargers(params, signal),
    refetchInterval: POLL_INTERVAL_MS,
    // SSR initialData를 마운트 직후 바로 stale 취급해 재요청하지 않고,
    // refetchInterval의 60초 주기로만 갱신되게 한다.
    staleTime: POLL_INTERVAL_MS,
    initialData: options?.initialData,
  });

  return {
    chargers: query.data?.chargers ?? [],
    truncated: query.data?.truncated ?? false,
    status: query.isPending ? "loading" : query.isError ? "error" : "success",
    error: query.error,
    isFetching: query.isFetching,
  };
};
