import { chgerTypesForSpeed, statsForUiStatus } from "@binchung/core";
import type { BboxFilter } from "@binchung/db";

export type ChargersQueryError =
  | { type: "MISSING_BBOX" }
  | { type: "INVALID_BBOX"; raw: string }
  | { type: "INVALID_TYPE"; raw: string }
  | { type: "INVALID_STAT"; raw: string };

export type ParseChargersQueryResult =
  | { ok: true; filter: BboxFilter }
  | { ok: false; error: ChargersQueryError };

export function parseChargersQuery(searchParams: URLSearchParams): ParseChargersQueryResult {
  const bboxRaw = searchParams.get("bbox");
  if (!bboxRaw) {
    return { ok: false, error: { type: "MISSING_BBOX" } };
  }

  const bboxResult = parseBbox(bboxRaw);
  if (!bboxResult) {
    return { ok: false, error: { type: "INVALID_BBOX", raw: bboxRaw } };
  }

  const filter: BboxFilter = bboxResult;

  const zcode = searchParams.get("zcode");
  if (zcode) {
    filter.zcode = zcode;
  }

  const typeRaw = searchParams.get("type");
  if (typeRaw) {
    if (typeRaw !== "fast" && typeRaw !== "slow") {
      return { ok: false, error: { type: "INVALID_TYPE", raw: typeRaw } };
    }
    filter.chgerTypes = chgerTypesForSpeed(typeRaw);
  }

  const statRaw = searchParams.get("stat");
  if (statRaw) {
    if (statRaw !== "waiting" && statRaw !== "charging" && statRaw !== "other") {
      return { ok: false, error: { type: "INVALID_STAT", raw: statRaw } };
    }
    filter.stats = statsForUiStatus(statRaw);
  }

  return { ok: true, filter };
}

function parseBbox(raw: string): BboxFilter | null {
  const parts = raw.split(",");
  if (parts.length !== 4) return null;

  const [minLng, minLat, maxLng, maxLat] = parts.map(Number);
  if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) return null;
  if (minLng >= maxLng || minLat >= maxLat) return null;
  if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) return null;

  return { minLng, minLat, maxLng, maxLat };
}
