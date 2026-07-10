import type { ChargerInfoSource, FetchPageParams } from "./chargerInfoSource.js";

const ENDPOINT = "http://apis.data.go.kr/B552584/EvCharger/getChargerInfo";

export interface LiveChargerInfoSourceOptions {
  serviceKey: string;
  fetchImpl?: typeof fetch;
}

export function createLiveChargerInfoSource(options: LiveChargerInfoSourceOptions): ChargerInfoSource {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async fetchPage(params: FetchPageParams, signal?: AbortSignal): Promise<string> {
      const url = new URL(ENDPOINT);
      url.searchParams.set("serviceKey", options.serviceKey);
      url.searchParams.set("pageNo", String(params.pageNo));
      url.searchParams.set("numOfRows", String(params.numOfRows));
      if (params.zcode) {
        url.searchParams.set("zcode", params.zcode);
      }

      const response = await fetchImpl(url, { signal });
      return response.text();
    },
  };
}
