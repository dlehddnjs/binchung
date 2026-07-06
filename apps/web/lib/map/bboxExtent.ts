import { transformExtent } from "ol/proj";

export interface BboxLngLat {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export function extent3857ToBboxLngLat(extent: [number, number, number, number]): BboxLngLat {
  const [minLng, minLat, maxLng, maxLat] = transformExtent(extent, "EPSG:3857", "EPSG:4326");
  return { minLng, minLat, maxLng, maxLat };
}

export function bboxLngLatToQueryParam(bbox: BboxLngLat): string {
  return `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`;
}
