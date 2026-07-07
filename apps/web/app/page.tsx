import { selectChargersInBbox } from "@binchung/db";
import { ChargerMap } from "../components/ChargerMap";
import { DetailSheet } from "../components/DetailSheet";
import { FilterBar } from "../components/FilterBar";
import { getPool } from "../lib/db";
import { KOREA_BBOX_FILTER } from "../lib/map/koreaBbox";

// RSC 내부의 pool.query()는 Next의 정적/동적 렌더링 분석에 안 잡힌다 — 없으면
// next build가 이 페이지를 정적으로 취급해 빌드 시점 DB 스냅샷을 굳혀버린다.
export const dynamic = "force-dynamic";

export default async function Home() {
  const { rows, truncated } = await fetchInitialChargers();
  return (
    <main style={{ position: "absolute", inset: 0 }}>
      <ChargerMap initialChargers={rows} initialTruncated={truncated} />
      <FilterBar />
      <DetailSheet />
    </main>
  );
}

async function fetchInitialChargers() {
  try {
    return await selectChargersInBbox(getPool(), KOREA_BBOX_FILTER);
  } catch {
    // 로컬 개발 환경에 DB가 없어도 페이지 자체는 항상 렌더되게 폴백한다.
    return { rows: [], truncated: false };
  }
}
