import type { ChargerInfoItem } from "@binchung/core";
import { describe, expect, it } from "vitest";
import { mapChargerInfoItems } from "./mapChargerInfoItems.js";

function item(overrides: Partial<ChargerInfoItem> = {}): ChargerInfoItem {
  return {
    statId: "S1",
    statNm: "충전소1",
    addr: "주소1",
    lat: 37.5,
    lng: 127.0,
    zcode: "11",
    useTime: "24시간",
    busiNm: "기관1",
    chgerId: "01",
    chgerType: "06",
    outputKw: 50,
    stat: 2,
    statUpdDt: "20260101000000",
    ...overrides,
  };
}

describe("mapChargerInfoItems", () => {
  it("단일 item을 station 1개 + charger 1개로 매핑한다", () => {
    const result = mapChargerInfoItems([item()]);

    expect(result.stations).toEqual([
      {
        statId: "S1",
        name: "충전소1",
        addr: "주소1",
        lat: 37.5,
        lng: 127.0,
        zcode: "11",
        useTime: "24시간",
        busiNm: "기관1",
      },
    ]);
    expect(result.chargers).toEqual([
      { statId: "S1", chgerId: "01", chgerType: "06", outputKw: 50 },
    ]);
  });

  it("같은 statId의 여러 충전기는 station 1건 + charger 여러 건으로 매핑한다", () => {
    const result = mapChargerInfoItems([
      item({ chgerId: "01" }),
      item({ chgerId: "02", chgerType: "02", outputKw: 7 }),
    ]);

    expect(result.stations).toHaveLength(1);
    expect(result.chargers).toHaveLength(2);
    expect(result.chargers.map((c) => c.chgerId)).toEqual(["01", "02"]);
  });

  it("동일 statId가 여러 item에서 반복돼도 station은 마지막 값으로 중복 없이 정리된다", () => {
    const result = mapChargerInfoItems([
      item({ statNm: "이전이름" }),
      item({ chgerId: "02", statNm: "최신이름" }),
    ]);

    expect(result.stations).toHaveLength(1);
    expect(result.stations[0]?.name).toBe("최신이름");
  });

  it("동일 (statId, chgerId)가 반복돼도 charger는 마지막 값으로 중복 없이 정리된다", () => {
    const result = mapChargerInfoItems([
      item({ chgerId: "01", chgerType: "01" }),
      item({ chgerId: "01", chgerType: "06" }),
    ]);

    expect(result.chargers).toHaveLength(1);
    expect(result.chargers[0]?.chgerType).toBe("06");
  });

  it("빈 배열이면 빈 결과를 반환한다", () => {
    expect(mapChargerInfoItems([])).toEqual({ stations: [], chargers: [] });
  });
});
