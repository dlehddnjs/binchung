import { describe, expect, it } from "vitest";
import { parseChargersQuery } from "./parseChargersQuery.js";

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("parseChargersQuery", () => {
  it("bbox가 없으면 MISSING_BBOX", () => {
    const result = parseChargersQuery(params(""));
    expect(result).toEqual({ ok: false, error: { type: "MISSING_BBOX" } });
  });

  it("bbox가 빈 문자열이면 MISSING_BBOX", () => {
    const result = parseChargersQuery(params("bbox="));
    expect(result).toEqual({ ok: false, error: { type: "MISSING_BBOX" } });
  });

  it.each([
    "126.9,37.4,127.2", // 개수 부족
    "126.9,37.4,127.2,37.7,1", // 개수 초과
    "a,37.4,127.2,37.7", // 숫자 아님
    "126.9,37.4,127.2,Infinity", // 유한하지 않음
    "127.2,37.4,126.9,37.7", // minLng > maxLng
    "126.9,37.7,127.2,37.4", // minLat > maxLat
    "-181,37.4,127.2,37.7", // 경도 범위 초과
    "126.9,37.4,127.2,91", // 위도 범위 초과
  ])("malformed bbox=%s는 INVALID_BBOX", (bbox) => {
    const result = parseChargersQuery(params(`bbox=${bbox}`));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("INVALID_BBOX");
    }
  });

  it("유효한 bbox만 있으면 zcode/chgerTypes/stats 없이 필터를 반환한다", () => {
    const result = parseChargersQuery(params("bbox=126.9,37.4,127.2,37.7"));
    expect(result).toEqual({
      ok: true,
      filter: { minLng: 126.9, minLat: 37.4, maxLng: 127.2, maxLat: 37.7 },
    });
  });

  it("zcode를 그대로 passthrough한다", () => {
    const result = parseChargersQuery(params("bbox=126.9,37.4,127.2,37.7&zcode=11"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.filter.zcode).toBe("11");
    }
  });

  it("zcode가 빈 문자열이면 없음으로 취급한다", () => {
    const result = parseChargersQuery(params("bbox=126.9,37.4,127.2,37.7&zcode="));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.filter.zcode).toBeUndefined();
    }
  });

  it.each(["fast", "slow"] as const)("type=%s는 대응하는 chgerType 코드 배열로 변환된다", (type) => {
    const result = parseChargersQuery(params(`bbox=126.9,37.4,127.2,37.7&type=${type}`));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.filter.chgerTypes).toBeDefined();
      expect(result.filter.chgerTypes!.length).toBeGreaterThan(0);
    }
  });

  it("type이 빈 문자열이면 없음으로 취급한다", () => {
    const result = parseChargersQuery(params("bbox=126.9,37.4,127.2,37.7&type="));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.filter.chgerTypes).toBeUndefined();
    }
  });

  it.each(["unknown", "foo"])("type=%s는 INVALID_TYPE", (type) => {
    const result = parseChargersQuery(params(`bbox=126.9,37.4,127.2,37.7&type=${type}`));
    expect(result).toEqual({ ok: false, error: { type: "INVALID_TYPE", raw: type } });
  });

  it.each(["waiting", "charging", "other"] as const)(
    "stat=%s는 대응하는 stat 코드 배열로 변환된다",
    (stat) => {
      const result = parseChargersQuery(params(`bbox=126.9,37.4,127.2,37.7&stat=${stat}`));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.filter.stats).toBeDefined();
        expect(result.filter.stats!.length).toBeGreaterThan(0);
      }
    },
  );

  it("stat이 빈 문자열이면 없음으로 취급한다", () => {
    const result = parseChargersQuery(params("bbox=126.9,37.4,127.2,37.7&stat="));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.filter.stats).toBeUndefined();
    }
  });

  it.each(["unknown", "foo"])("stat=%s는 INVALID_STAT", (stat) => {
    const result = parseChargersQuery(params(`bbox=126.9,37.4,127.2,37.7&stat=${stat}`));
    expect(result).toEqual({ ok: false, error: { type: "INVALID_STAT", raw: stat } });
  });

  it("bbox+zcode+type+stat이 전부 조합되면 모든 필터가 채워진다", () => {
    const result = parseChargersQuery(
      params("bbox=126.9,37.4,127.2,37.7&zcode=11&type=fast&stat=waiting"),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.filter.minLng).toBe(126.9);
      expect(result.filter.zcode).toBe("11");
      expect(result.filter.chgerTypes).toEqual(expect.arrayContaining(["04"]));
      expect(result.filter.stats).toEqual([2]);
    }
  });
});
