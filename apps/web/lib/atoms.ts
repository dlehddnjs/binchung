import type { ChargerMapRow } from "@binchung/db";
import { atom } from "jotai";
import type { BboxLngLat } from "./map/bboxExtent";
import { KOREA_BBOX } from "./map/koreaBbox";

// ChargerMap의 OL `moveend` 리스너가 유일한 writer.
export const viewportAtom = atom<BboxLngLat>(KOREA_BBOX);

// useChargersFeed가 매 갱신마다 반영하는 read-model. 이슈 #9의 상세 시트가
// 훅을 다시 호출하지 않고 이 atom만 구독할 수 있게 하기 위한 준비.
export const chargersAtom = atom<ChargerMapRow[]>([]);
