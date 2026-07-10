/**
 * 이슈 #11 baseline 성능측정용 합성 데이터 시더.
 *
 * 이 세션의 네트워크 환경에서 환경부 실 API(getChargerInfo/getChargerStatus)가
 * serviceKey= 파라미터가 포함된 요청에서만 지속적으로 타임아웃되어(§DESIGN-phase1
 * 문서화된 "간헐적" 불안정성과는 다른 패턴), full sync로 실 데이터를 채울 수 없었다.
 * "전국 뷰" FPS/frame time baseline은 실제 규모(수천~수만 건)의 데이터가 지도에
 * 떠 있어야 의미가 있으므로, fixtures의 실제 필드 형태를 참고해 전국에 분포한
 * 합성 충전소/충전기/상태 데이터를 생성해 로컬 DB에 직접 적재한다.
 *
 * 기존 @binchung/db의 upsert 함수를 그대로 재사용 — DB 스키마/쓰기 경로는 실제
 * collector와 동일하다. Phase 3 전 baseline을 재측정할 때, 그때는 이 환경 제약이
 * 없다면 실 API full sync를 우선 시도할 것.
 */
import { createPool } from "@binchung/db";
import { upsertChargers, upsertChargerStatus, upsertStations } from "@binchung/db";
import type { ChargerRow, ChargerStatusRow, StationRow } from "@binchung/db";

const STATION_COUNT = 8000;

const CITIES: { name: string; zcode: string; lat: number; lng: number }[] = [
  { name: "서울특별시", zcode: "11", lat: 37.5665, lng: 126.978 },
  { name: "부산광역시", zcode: "26", lat: 35.1796, lng: 129.0756 },
  { name: "대구광역시", zcode: "27", lat: 35.8714, lng: 128.6014 },
  { name: "인천광역시", zcode: "28", lat: 37.4563, lng: 126.7052 },
  { name: "광주광역시", zcode: "29", lat: 35.1595, lng: 126.8526 },
  { name: "대전광역시", zcode: "30", lat: 36.3504, lng: 127.3845 },
  { name: "울산광역시", zcode: "31", lat: 35.5384, lng: 129.3114 },
  { name: "세종특별자치시", zcode: "36", lat: 36.48, lng: 127.289 },
  { name: "경기도", zcode: "41", lat: 37.4138, lng: 127.5183 },
  { name: "강원특별자치도", zcode: "42", lat: 37.8228, lng: 128.1555 },
  { name: "충청북도", zcode: "43", lat: 36.8, lng: 127.7 },
  { name: "충청남도", zcode: "44", lat: 36.5, lng: 126.8 },
  { name: "전북특별자치도", zcode: "45", lat: 35.7175, lng: 127.153 },
  { name: "전라남도", zcode: "46", lat: 34.8679, lng: 126.991 },
  { name: "경상북도", zcode: "47", lat: 36.4919, lng: 128.8889 },
  { name: "경상남도", zcode: "48", lat: 35.4606, lng: 128.2132 },
  { name: "제주특별자치도", zcode: "50", lat: 33.4996, lng: 126.5312 },
];

const BUSI_NAMES = ["기후에너지환경부", "한국전력공사", "지엔텔", "차지비", "이브이시스", "포스코ICT"];
const ROAD_NAMES = ["테스트로", "충전로", "그린로", "에너지로", "평화로", "중앙로"];
const CHGER_TYPES = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"];

// stat 분포: waiting(2) 다수, charging(3)/reserved(6) 중간, 나머지 unknown류 소수 — 지도에서
// 초록/주황/회색이 고르게 섞이도록 임의로 정한 가중치(실측치 아님).
const STAT_WEIGHTS: [number, number][] = [
  [2, 40],
  [3, 25],
  [6, 10],
  [0, 5],
  [1, 5],
  [4, 5],
  [5, 5],
  [9, 5],
];

function pickWeightedStat(): number {
  const total = STAT_WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [stat, weight] of STAT_WEIGHTS) {
    if (roll < weight) return stat;
    roll -= weight;
  }
  return 9;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

async function main(): Promise<void> {
  const pool = createPool();
  const stations: StationRow[] = [];
  const chargers: ChargerRow[] = [];
  const statuses: ChargerStatusRow[] = [];
  const now = new Date();

  for (let i = 0; i < STATION_COUNT; i++) {
    const city = pick(CITIES);
    const statId = `SYN${String(i).padStart(6, "0")}`;
    const lat = city.lat + (Math.random() - 0.5) * 0.6;
    const lng = city.lng + (Math.random() - 0.5) * 0.6;

    stations.push({
      statId,
      name: `${city.name} 합성 충전소 ${i}`,
      addr: `${city.name} ${pick(ROAD_NAMES)} ${Math.floor(Math.random() * 200) + 1}`,
      lat,
      lng,
      zcode: city.zcode,
      useTime: Math.random() < 0.5 ? "24시간 이용가능" : null,
      busiNm: pick(BUSI_NAMES),
    });

    const chargerCount = Math.random() < 0.6 ? 1 : 2;
    for (let c = 1; c <= chargerCount; c++) {
      const chgerId = String(c).padStart(2, "0");
      chargers.push({
        statId,
        chgerId,
        chgerType: pick(CHGER_TYPES),
        outputKw: pick([50, 100]),
      });
      statuses.push({
        statId,
        chgerId,
        stat: pickWeightedStat(),
        statUpdDt: now,
      });
    }
  }

  console.log(`합성 데이터 생성 완료: stations=${stations.length}, chargers=${chargers.length}`);
  await upsertStations(pool, stations);
  await upsertChargers(pool, chargers);
  await upsertChargerStatus(pool, statuses);
  console.log("DB 적재 완료");

  await pool.end();
}

main().catch((error: unknown) => {
  console.error("합성 데이터 시딩 실패:", error);
  process.exitCode = 1;
});
