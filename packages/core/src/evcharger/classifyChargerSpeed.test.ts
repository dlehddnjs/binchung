import { describe, expect, it } from "vitest";
import { chgerTypesForSpeed, classifyChargerSpeed } from "./classifyChargerSpeed.js";

describe("classifyChargerSpeed", () => {
  it.each(["01", "03", "04", "05", "06", "07", "09", "10", "11"])(
    "chgerType=%s는 fast",
    (chgerType) => {
      expect(classifyChargerSpeed(chgerType)).toBe("fast");
    },
  );

  it.each(["02", "08"])("chgerType=%s(완속)는 slow", (chgerType) => {
    expect(classifyChargerSpeed(chgerType)).toBe("slow");
  });

  it.each(["12", "00", "", "1", "XX"])("chgerType=%s(미지/비정규 코드)는 unknown", (chgerType) => {
    expect(classifyChargerSpeed(chgerType)).toBe("unknown");
  });
});

describe("chgerTypesForSpeed", () => {
  it("fast는 급속 코드 전부를 반환한다", () => {
    expect(new Set(chgerTypesForSpeed("fast"))).toEqual(
      new Set(["01", "03", "04", "05", "06", "07", "09", "10", "11"]),
    );
  });

  it("slow는 완속 코드 전부를 반환한다", () => {
    expect(new Set(chgerTypesForSpeed("slow"))).toEqual(new Set(["02", "08"]));
  });

  it("classifyChargerSpeed와 왕복 일관성을 갖는다", () => {
    for (const speed of ["fast", "slow"] as const) {
      for (const chgerType of chgerTypesForSpeed(speed)) {
        expect(classifyChargerSpeed(chgerType)).toBe(speed);
      }
    }
  });
});
