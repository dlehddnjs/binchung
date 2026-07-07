import type { ChargerMapRow } from "@binchung/db";
import { describe, expect, it } from "vitest";
import { groupStationChargers } from "./groupStationChargers";

function makeRow(overrides: Partial<ChargerMapRow> = {}): ChargerMapRow {
  return {
    statId: "ST1",
    chgerId: "01",
    name: "테스트 충전소",
    addr: "테스트 주소",
    lat: 37.5,
    lng: 127.0,
    zcode: "11",
    chgerType: "04",
    stat: 2,
    statUpdDt: null,
    ...overrides,
  };
}

describe("groupStationChargers", () => {
  it("statId가 null이면 null을 반환한다", () => {
    expect(groupStationChargers([makeRow()], null)).toBeNull();
  });

  it("일치하는 행이 없으면 null을 반환한다", () => {
    expect(groupStationChargers([makeRow({ statId: "ST1" })], "ST2")).toBeNull();
  });

  it("선택된 statId의 충전기들만 name/addr와 함께 묶는다", () => {
    const rows = [
      makeRow({ statId: "ST1", chgerId: "01" }),
      makeRow({ statId: "ST1", chgerId: "02" }),
      makeRow({ statId: "ST2", chgerId: "01" }),
    ];

    const group = groupStationChargers(rows, "ST1");

    expect(group).toEqual({
      statId: "ST1",
      name: "테스트 충전소",
      addr: "테스트 주소",
      chargers: [rows[0], rows[1]],
    });
  });
});
