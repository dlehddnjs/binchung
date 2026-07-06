import type { BboxFilter } from "@binchung/db";
import type { BboxLngLat } from "./bboxExtent";

// 정밀 GIS 경계가 아니라 초기 화면을 대한민국 전역으로 프레이밍하기 위한 대략치 상수.
export const KOREA_BBOX: BboxLngLat = {
  minLng: 124.5,
  minLat: 33.0,
  maxLng: 131.9,
  maxLat: 38.75,
};

export const KOREA_BBOX_FILTER: BboxFilter = { ...KOREA_BBOX };

export const KOREA_CENTER: [number, number] = [127.9, 36.5];
export const KOREA_DEFAULT_ZOOM = 7;
