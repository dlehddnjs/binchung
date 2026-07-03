export interface StationRow {
  statId: string;
  name: string;
  addr: string | null;
  lat: number;
  lng: number;
  zcode: string;
  useTime: string | null;
  busiNm: string | null;
}

export interface ChargerRow {
  statId: string;
  chgerId: string;
  chgerType: string;
  outputKw: number | null;
}
