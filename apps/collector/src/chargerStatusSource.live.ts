import type { ChargerStatusSource, FetchStatusPageParams } from "./chargerStatusSource.js";

const ENDPOINT = "http://apis.data.go.kr/B552584/EvCharger/getChargerStatus";

export interface LiveChargerStatusSourceOptions {
  serviceKey: string;
  fetchImpl?: typeof fetch;
}

export function createLiveChargerStatusSource(
  options: LiveChargerStatusSourceOptions,
): ChargerStatusSource {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async fetchPage(params: FetchStatusPageParams): Promise<string> {
      const url = new URL(ENDPOINT);
      url.searchParams.set("serviceKey", options.serviceKey);
      url.searchParams.set("pageNo", String(params.pageNo));
      url.searchParams.set("numOfRows", String(params.numOfRows));
      url.searchParams.set("period", String(params.period));
      if (params.zcode) {
        url.searchParams.set("zcode", params.zcode);
      }

      const response = await fetchImpl(url);
      return response.text();
    },
  };
}
