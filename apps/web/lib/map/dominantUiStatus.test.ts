import { describe, expect, it } from "vitest";
import { dominantUiStatus } from "./dominantUiStatus";

describe("dominantUiStatus", () => {
  it("가장 많은 상태를 고른다", () => {
    expect(dominantUiStatus(["other", "charging", "charging"])).toBe("charging");
  });

  it("동률이면 waiting > charging > other > unknown 우선순위", () => {
    expect(dominantUiStatus(["charging", "waiting"])).toBe("waiting");
    expect(dominantUiStatus(["other", "charging"])).toBe("charging");
    expect(dominantUiStatus(["unknown", "other"])).toBe("other");
  });

  it("빈 배열이면 방어적으로 unknown", () => {
    expect(dominantUiStatus([])).toBe("unknown");
  });

  it("단일 원소면 그대로 반환", () => {
    expect(dominantUiStatus(["waiting"])).toBe("waiting");
  });
});
