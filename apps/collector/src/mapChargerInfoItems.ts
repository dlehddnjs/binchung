import type { ChargerInfoItem } from "@binchung/core";
import type { ChargerRow, StationRow } from "@binchung/db";

export interface MappedChargerInfo {
  stations: StationRow[];
  chargers: ChargerRow[];
}

export function mapChargerInfoItems(items: ChargerInfoItem[]): MappedChargerInfo {
  const stationsByKey = new Map<string, StationRow>();
  const chargersByKey = new Map<string, ChargerRow>();

  for (const item of items) {
    stationsByKey.set(item.statId, {
      statId: item.statId,
      name: item.statNm,
      addr: item.addr || null,
      lat: item.lat,
      lng: item.lng,
      zcode: item.zcode,
      useTime: item.useTime || null,
      busiNm: item.busiNm || null,
    });

    chargersByKey.set(`${item.statId}:${item.chgerId}`, {
      statId: item.statId,
      chgerId: item.chgerId,
      chgerType: item.chgerType,
      outputKw: item.outputKw,
      delYn: item.delYn,
    });
  }

  return {
    stations: [...stationsByKey.values()],
    chargers: [...chargersByKey.values()],
  };
}
