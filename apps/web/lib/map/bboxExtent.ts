import { transformExtent } from "ol/proj";

export interface BboxLngLat {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function extent3857ToBboxLngLat(extent: [number, number, number, number]): BboxLngLat {
  const [minLng, minLat, maxLng, maxLat] = transformExtent(extent, "EPSG:3857", "EPSG:4326");
  return {
    // OL View는 extent/minZoom 제한이 없어 축소·드래그만으로도 ±180°/±90°를 넘는 값이
    // 나올 수 있다 — /api/chargers는 이 범위를 벗어나면 400을 반환하므로 여기서 clamp한다.
    minLng: clamp(minLng, -180, 180),
    minLat: clamp(minLat, -90, 90),
    maxLng: clamp(maxLng, -180, 180),
    maxLat: clamp(maxLat, -90, 90),
  };
}

export function bboxLngLatToQueryParam(bbox: BboxLngLat): string {
  return `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`;
}
