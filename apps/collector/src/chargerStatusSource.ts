export interface FetchStatusPageParams {
  pageNo: number;
  numOfRows: number;
  period: number;
  zcode?: string;
}

export interface ChargerStatusSource {
  fetchPage(params: FetchStatusPageParams): Promise<string>;
}
