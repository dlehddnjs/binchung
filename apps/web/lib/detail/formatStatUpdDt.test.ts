import { describe, expect, it } from "vitest";
import { formatStatUpdDt } from "./formatStatUpdDt";

describe("formatStatUpdDt", () => {
  it("null이면 '-'를 반환한다", () => {
    expect(formatStatUpdDt(null)).toBe("-");
  });

  it("파싱 불가능한 문자열이면 '-'를 반환한다", () => {
    expect(formatStatUpdDt("not-a-date")).toBe("-");
  });

  it("Date 인스턴스와 그 ISO 문자열은 동일한 결과를 만든다", () => {
    const date = new Date("2026-07-06T00:00:00.000Z");
    expect(formatStatUpdDt(date)).toBe(formatStatUpdDt(date.toISOString()));
  });

  it("KST 기준으로 포맷한다", () => {
    // 2026-07-06T00:00:00.000Z == 2026-07-06 09:00 KST
    const formatted = formatStatUpdDt("2026-07-06T00:00:00.000Z");
    expect(formatted).toContain("09:00");
  });
});
