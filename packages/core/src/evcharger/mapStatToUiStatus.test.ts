import { describe, expect, it } from "vitest";
import { mapStatToUiStatus } from "./mapStatToUiStatus.js";

describe("mapStatToUiStatus", () => {
  it("2(충전대기)는 waiting", () => {
    expect(mapStatToUiStatus(2)).toBe("waiting");
  });

  it.each([3, 6])("%i(충전중/예약중)는 charging", (stat) => {
    expect(mapStatToUiStatus(stat)).toBe("charging");
  });

  it.each([0, 1, 4, 5, 9])("%i(문서화된 비활성 상태)는 other", (stat) => {
    expect(mapStatToUiStatus(stat)).toBe("other");
  });

  it.each([7, 8, 10, -1, 2.5, NaN])("%s(문서에 없는 값)는 unknown", (stat) => {
    expect(mapStatToUiStatus(stat)).toBe("unknown");
  });
});
