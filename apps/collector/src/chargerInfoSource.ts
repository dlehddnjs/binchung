export interface FetchPageParams {
  pageNo: number;
  numOfRows: number;
  zcode?: string;
}

export interface ChargerInfoSource {
  fetchPage(params: FetchPageParams): Promise<string>;
}
