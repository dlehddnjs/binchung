import { describe, expect, it } from "vitest";
import { parseStatUpdDt } from "./parseStatUpdDt.js";

describe("parseStatUpdDt", () => {
  it("YYYYMMDDHHmmss(KST)를 올바른 UTC Date로 변환한다", () => {
    const date = parseStatUpdDt("20260703104804");
    expect(date?.toISOString()).toBe("2026-07-03T01:48:04.000Z");
  });

  it("KST 자정 근처는 날짜가 바뀔 수 있다 (KST 00:00 = 전날 UTC 15:00)", () => {
    const date = parseStatUpdDt("20260101000000");
    expect(date?.toISOString()).toBe("2025-12-31T15:00:00.000Z");
  });

  it("빈 문자열이면 null이다", () => {
    expect(parseStatUpdDt("")).toBeNull();
  });

  it("자릿수가 안 맞으면 null이다", () => {
    expect(parseStatUpdDt("202607031048")).toBeNull();
  });

  it("숫자가 아닌 문자가 섞이면 null이다", () => {
    expect(parseStatUpdDt("2026070310480X")).toBeNull();
  });
});
