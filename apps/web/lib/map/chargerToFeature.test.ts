import type { ChargerMapRow } from "@binchung/db";
import { fromLonLat } from "ol/proj";
import { describe, expect, it } from "vitest";
import { chargerToFeature } from "./chargerToFeature";

function makeRow(overrides: Partial<ChargerMapRow> = {}): ChargerMapRow {
  return {
    statId: "ST1",
    chgerId: "01",
    name: "테스트 충전소",
    addr: null,
    lat: 37.5,
    lng: 127.0,
    zcode: "11",
    chgerType: "04",
    stat: 2,
    statUpdDt: null,
    ...overrides,
  };
}

describe("chargerToFeature", () => {
  it("statId/chgerId/uiStatus 속성을 갖는 Feature를 만든다", () => {
    const feature = chargerToFeature(makeRow({ stat: 2 }));

    expect(feature.get("statId")).toBe("ST1");
    expect(feature.get("chgerId")).toBe("01");
    expect(feature.get("uiStatus")).toBe("waiting");
  });

  it("stat 코드에 따라 mapStatToUiStatus로 uiStatus를 분류한다", () => {
    expect(chargerToFeature(makeRow({ stat: 3 })).get("uiStatus")).toBe("charging");
    expect(chargerToFeature(makeRow({ stat: 0 })).get("uiStatus")).toBe("other");
    expect(chargerToFeature(makeRow({ stat: 999 })).get("uiStatus")).toBe("unknown");
  });

  it("geometry 좌표는 lng/lat을 EPSG:3857로 투영한 값이다", () => {
    const feature = chargerToFeature(makeRow({ lng: 127.0, lat: 37.5 }));
    const geometry = feature.getGeometry();
    const expected = fromLonLat([127.0, 37.5]);

    expect(geometry?.getCoordinates()).toEqual(expected);
  });
});
