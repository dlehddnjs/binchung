import type { ChargerMapRow } from "@binchung/db";
import { atom } from "jotai";
import type { BboxLngLat } from "./map/bboxExtent";
import { KOREA_BBOX } from "./map/koreaBbox";

// ChargerMap의 OL `moveend` 리스너가 유일한 writer.
export const viewportAtom = atom<BboxLngLat>(KOREA_BBOX);

// useChargersFeed가 매 갱신마다 반영하는 read-model. 이슈 #9의 상세 시트가
// 훅을 다시 호출하지 않고 이 atom만 구독할 수 있게 하기 위한 준비.
export const chargersAtom = atom<ChargerMapRow[]>([]);

export interface StationFilter {
  zcode?: string; // 이슈 #9는 UI 없음, 타입만 예약 유지(지역 필터는 별도 이슈로 이관)
  chgerType?: "fast" | "slow";
  stat?: "waiting" | "charging" | "other";
}

// FilterBar가 쓰고 ChargerMap이 읽어 viewportAtom과 합성한다.
export const filterAtom = atom<StationFilter>({});

// §6 원 3-atom 목록엔 없던 추가 atom — 클릭 선택 상태를 ChargerMap(writer)과
// DetailSheet(reader + 닫기 버튼의 writer) 사이에서 공유하기 위해 필요해졌다.
export const selectedStationIdAtom = atom<string | null>(null);
