import { describe, expect, it } from "vitest";
import { makeChargerKey } from "./chargerKey.js";

describe("makeChargerKey", () => {
  it("statId와 chgerId를 조합한 키를 만든다", () => {
    expect(makeChargerKey("ME174013", "01")).toBe("ME174013:01");
  });

  it("statId/chgerId에 구분자와 같은 문자가 섞여도 서로 다른 조합끼리 충돌하지 않는다", () => {
    const a = makeChargerKey("A:B", "C");
    const b = makeChargerKey("A", "B:C");
    expect(a).not.toBe(b);
  });
});
