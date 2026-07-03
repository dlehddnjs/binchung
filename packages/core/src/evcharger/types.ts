export interface ResponseHeader {
  resultCode: string;
  resultMsg: string;
  totalCount: number;
  pageNo: number;
  numOfRows: number;
}

export interface ChargerInfoItem {
  statId: string;
  statNm: string;
  addr: string;
  lat: number;
  lng: number;
  zcode: string;
  useTime: string;
  busiNm: string;
  chgerId: string;
  chgerType: string;
  outputKw: number | null;
  stat: number;
  statUpdDt: string;
}

export interface ChargerStatusItem {
  statId: string;
  chgerId: string;
  stat: number;
  statUpdDt: string;
}

export interface SkippedItem {
  index: number;
  reason: string;
}

export type ParseError =
  | { type: "NOT_XML"; raw: string }
  | { type: "API_ERROR"; resultCode: string; resultMsg: string }
  | { type: "MALFORMED_XML"; raw: string; cause: unknown };

export type ParseResult<T> =
  | { ok: true; header: ResponseHeader; items: T[]; skipped: SkippedItem[] }
  | { ok: false; error: ParseError };
