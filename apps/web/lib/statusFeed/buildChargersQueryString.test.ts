import { describe, expect, it } from "vitest";
import { buildChargersQueryString } from "./buildChargersQueryString";

const BBOX = { minLng: 126.9, minLat: 37.4, maxLng: 127.2, maxLat: 37.7 };

describe("buildChargersQueryString", () => {
  it("bbox만 있으면 bbox 파라미터만 포함한다", () => {
    const qs = buildChargersQueryString({ bbox: BBOX });
    expect(qs).toBe("bbox=126.9%2C37.4%2C127.2%2C37.7");
  });

  it("zcode/chgerType/stat이 있으면 type/stat/zcode 파라미터도 포함한다", () => {
    const qs = buildChargersQueryString({
      bbox: BBOX,
      zcode: "11",
      chgerType: "fast",
      stat: "waiting",
    });
    const params = new URLSearchParams(qs);

    expect(params.get("bbox")).toBe("126.9,37.4,127.2,37.7");
    expect(params.get("zcode")).toBe("11");
    expect(params.get("type")).toBe("fast");
    expect(params.get("stat")).toBe("waiting");
  });
});
