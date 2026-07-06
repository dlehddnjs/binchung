import { describe, expect, it } from "vitest";
import { chargersQueryKey } from "./chargersQueryKey";

const BBOX_A = { minLng: 126.9, minLat: 37.4, maxLng: 127.2, maxLat: 37.7 };
const BBOX_B = { minLng: 128.9, minLat: 35.4, maxLng: 129.2, maxLat: 35.7 };

describe("chargersQueryKey", () => {
  it("같은 params면 같은 키를 만든다", () => {
    const a = chargersQueryKey({ bbox: BBOX_A, stat: "waiting" });
    const b = chargersQueryKey({ bbox: BBOX_A, stat: "waiting" });
    expect(a).toEqual(b);
  });

  it("bbox가 다르면 다른 키를 만든다", () => {
    const a = chargersQueryKey({ bbox: BBOX_A });
    const b = chargersQueryKey({ bbox: BBOX_B });
    expect(a).not.toEqual(b);
  });

  it("첫 원소는 'chargers'로 고정된다", () => {
    const [tag] = chargersQueryKey({ bbox: BBOX_A });
    expect(tag).toBe("chargers");
  });
});
