export interface FetchPageParams {
  pageNo: number;
  numOfRows: number;
  zcode?: string;
}

export interface ChargerInfoSource {
  fetchPage(params: FetchPageParams, signal?: AbortSignal): Promise<string>;
}
