import type { StatusDiffResult } from "@binchung/core";
import { describe, expect, it } from "vitest";
import { mapStatusDiffEntries } from "./mapStatusDiffEntries.js";

describe("mapStatusDiffEntries", () => {
  it("changed/unchanged/new 전부 chargerStatusRows에 포함한다", () => {
    const diff: StatusDiffResult = {
      changed: [{ statId: "A", chgerId: "01", prevStat: 2, nextStat: 3, statUpdDt: "20260101000000" }],
      unchanged: [{ statId: "B", chgerId: "01", prevStat: 2, nextStat: 2, statUpdDt: "20260101000100" }],
      new: [{ statId: "C", chgerId: "01", prevStat: null, nextStat: 9, statUpdDt: "20260101000200" }],
    };

    const result = mapStatusDiffEntries(diff);

    expect(result.chargerStatusRows).toHaveLength(3);
    expect(result.chargerStatusRows.map((r) => r.statId)).toEqual(["A", "B", "C"]);
  });

  it("changed와 new만 statusHistoryRows에 포함한다 (unchanged는 제외)", () => {
    const diff: StatusDiffResult = {
      changed: [{ statId: "A", chgerId: "01", prevStat: 2, nextStat: 3, statUpdDt: "20260101000000" }],
      unchanged: [{ statId: "B", chgerId: "01", prevStat: 2, nextStat: 2, statUpdDt: "20260101000100" }],
      new: [{ statId: "C", chgerId: "01", prevStat: null, nextStat: 9, statUpdDt: "20260101000200" }],
    };

    const result = mapStatusDiffEntries(diff);

    expect(result.statusHistoryRows).toHaveLength(2);
    expect(result.statusHistoryRows.map((r) => r.statId)).toEqual(["A", "C"]);
    expect(result.statusHistoryRows[1]?.prevStat).toBeNull();
  });

  it("statUpdDt 문자열을 Date로 파싱한다", () => {
    const diff: StatusDiffResult = {
      changed: [],
      unchanged: [],
      new: [{ statId: "A", chgerId: "01", prevStat: null, nextStat: 2, statUpdDt: "20260703104804" }],
    };

    const result = mapStatusDiffEntries(diff);

    expect(result.chargerStatusRows[0]?.statUpdDt?.toISOString()).toBe("2026-07-03T01:48:04.000Z");
  });

  it("잘못된 statUpdDt 문자열은 null로 처리한다", () => {
    const diff: StatusDiffResult = {
      changed: [],
      unchanged: [],
      new: [{ statId: "A", chgerId: "01", prevStat: null, nextStat: 2, statUpdDt: "" }],
    };

    const result = mapStatusDiffEntries(diff);

    expect(result.chargerStatusRows[0]?.statUpdDt).toBeNull();
  });

  it("전부 비어있으면 빈 결과를 반환한다", () => {
    const result = mapStatusDiffEntries({ changed: [], unchanged: [], new: [] });
    expect(result).toEqual({ chargerStatusRows: [], statusHistoryRows: [] });
  });
});
