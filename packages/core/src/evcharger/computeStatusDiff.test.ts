import { describe, expect, it } from "vitest";
import { makeChargerKey } from "./chargerKey.js";
import { computeStatusDiff } from "./computeStatusDiff.js";
import type { ChargerStatusItem } from "./types.js";

function item(statId: string, chgerId: string, stat: number, statUpdDt = "20260101000000"): ChargerStatusItem {
  return { statId, chgerId, stat, statUpdDt };
}

describe("computeStatusDiff", () => {
  it("stat이 달라지면 changed로 분류한다", () => {
    const current = new Map([[makeChargerKey("A", "01"), 2]]);
    const result = computeStatusDiff(current, [item("A", "01", 3, "20260101000100")]);

    expect(result.changed).toEqual([
      { statId: "A", chgerId: "01", prevStat: 2, nextStat: 3, statUpdDt: "20260101000100" },
    ]);
    expect(result.unchanged).toEqual([]);
    expect(result.new).toEqual([]);
  });

  it("stat이 같으면 unchanged로 분류한다 (statUpdDt는 incoming 값 사용)", () => {
    const current = new Map([[makeChargerKey("A", "01"), 2]]);
    const result = computeStatusDiff(current, [item("A", "01", 2, "20260101000200")]);

    expect(result.unchanged).toEqual([
      { statId: "A", chgerId: "01", prevStat: 2, nextStat: 2, statUpdDt: "20260101000200" },
    ]);
    expect(result.changed).toEqual([]);
    expect(result.new).toEqual([]);
  });

  it("current에 없는 충전기는 new로 분류하고 prevStat은 null이다", () => {
    const current = new Map<string, number>();
    const result = computeStatusDiff(current, [item("A", "01", 2)]);

    expect(result.new).toEqual([
      { statId: "A", chgerId: "01", prevStat: null, nextStat: 2, statUpdDt: "20260101000000" },
    ]);
    expect(result.changed).toEqual([]);
    expect(result.unchanged).toEqual([]);
  });

  it("빈 incoming이면 전부 빈 배열이다", () => {
    const current = new Map([[makeChargerKey("A", "01"), 2]]);
    const result = computeStatusDiff(current, []);

    expect(result).toEqual({ changed: [], unchanged: [], new: [] });
  });

  it("혼합 배치를 changed/unchanged/new로 동시에 분류하고 개수 합이 incoming과 같다", () => {
    const current = new Map([
      [makeChargerKey("A", "01"), 2],
      [makeChargerKey("B", "01"), 3],
    ]);
    const incoming = [
      item("A", "01", 3), // changed
      item("B", "01", 3), // unchanged
      item("C", "01", 2), // new
    ];
    const result = computeStatusDiff(current, incoming);

    expect(result.changed).toHaveLength(1);
    expect(result.unchanged).toHaveLength(1);
    expect(result.new).toHaveLength(1);
    expect(
      result.changed.length + result.unchanged.length + result.new.length,
    ).toBe(incoming.length);
  });

  it("같은 충전기가 배치 안에서 두 번 보고돼도 각각 원본 current 기준으로 독립 비교한다", () => {
    const current = new Map([[makeChargerKey("A", "01"), 2]]);
    const incoming = [item("A", "01", 3, "1"), item("A", "01", 3, "2")];
    const result = computeStatusDiff(current, incoming);

    // 캐스케이딩됐다면 두 번째 항목은 prevStat=3(첫 처리 결과)이 되어 unchanged로 잘못 분류됐을 것
    expect(result.changed).toEqual([
      { statId: "A", chgerId: "01", prevStat: 2, nextStat: 3, statUpdDt: "1" },
      { statId: "A", chgerId: "01", prevStat: 2, nextStat: 3, statUpdDt: "2" },
    ]);
    expect(result.unchanged).toEqual([]);
  });

  it("statId는 같고 chgerId만 다르면 별개 충전기로 취급해 new로 분류한다", () => {
    const current = new Map([[makeChargerKey("A", "01"), 2]]);
    const result = computeStatusDiff(current, [item("A", "02", 2)]);

    expect(result.new).toHaveLength(1);
    expect(result.changed).toEqual([]);
    expect(result.unchanged).toEqual([]);
  });
});
