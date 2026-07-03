import { describe, expect, it } from "vitest";
import { classifyChargerSpeed } from "./classifyChargerSpeed.js";

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
