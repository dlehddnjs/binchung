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
  delYn: boolean;
}

export interface ChargerStatusKey {
  statId: string;
  chgerId: string;
}

export interface ChargerStatusRow {
  statId: string;
  chgerId: string;
  stat: number;
  statUpdDt: Date | null;
}

export interface StatusHistoryRow {
  statId: string;
  chgerId: string;
  prevStat: number | null;
  nextStat: number;
  statUpdDt: Date | null;
}
