import { fromLonLat } from "ol/proj";
import { describe, expect, it } from "vitest";
import { bboxLngLatToQueryParam, extent3857ToBboxLngLat } from "./bboxExtent";

describe("extent3857ToBboxLngLat", () => {
  it("EPSG:3857 extent를 EPSG:4326 bbox로 변환한다", () => {
    const seoul = fromLonLat([126.9, 37.4]);
    const busan = fromLonLat([129.2, 35.5]);
    const extent: [number, number, number, number] = [seoul[0], busan[1], busan[0], seoul[1]];

    const bbox = extent3857ToBboxLngLat(extent);

    expect(bbox.minLng).toBeCloseTo(126.9, 6);
    expect(bbox.minLat).toBeCloseTo(35.5, 6);
    expect(bbox.maxLng).toBeCloseTo(129.2, 6);
    expect(bbox.maxLat).toBeCloseTo(37.4, 6);
  });
});

describe("bboxLngLatToQueryParam", () => {
  it("/api/chargers의 minLng,minLat,maxLng,maxLat 순서/포맷과 일치하는 문자열을 만든다", () => {
    const param = bboxLngLatToQueryParam({
      minLng: 126.9,
      minLat: 37.4,
      maxLng: 127.2,
      maxLat: 37.7,
    });

    expect(param).toBe("126.9,37.4,127.2,37.7");
  });
});
