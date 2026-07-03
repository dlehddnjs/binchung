import { describe, expect, it } from "vitest";
import { buildCurrentStatusMap } from "./buildCurrentStatusMap.js";
import { makeChargerKey } from "./chargerKey.js";

describe("buildCurrentStatusMap", () => {
  it("빈 배열이면 빈 Map을 반환한다", () => {
    expect(buildCurrentStatusMap([])).toEqual(new Map());
  });

  it("row들을 makeChargerKey 기준 Map으로 변환한다", () => {
    const map = buildCurrentStatusMap([
      { statId: "A", chgerId: "01", stat: 2 },
      { statId: "A", chgerId: "02", stat: 3 },
      { statId: "B", chgerId: "01", stat: 9 },
    ]);

    expect(map.get(makeChargerKey("A", "01"))).toBe(2);
    expect(map.get(makeChargerKey("A", "02"))).toBe(3);
    expect(map.get(makeChargerKey("B", "01"))).toBe(9);
    expect(map.size).toBe(3);
  });
});
