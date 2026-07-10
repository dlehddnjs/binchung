import type { Pool } from "pg";

export interface BboxFilter {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  zcode?: string;
  chgerTypes?: string[];
  stats?: number[];
  limit?: number;
}

export interface ChargerMapRow {
  statId: string;
  chgerId: string;
  name: string;
  addr: string | null;
  lat: number;
  lng: number;
  zcode: string;
  chgerType: string;
  stat: number;
  statUpdDt: Date | null;
}

export interface SelectChargersInBboxResult {
  rows: ChargerMapRow[];
  truncated: boolean;
}

const DEFAULT_LIMIT = 5000;

interface ChargerMapDbRow {
  stat_id: string;
  chger_id: string;
  name: string;
  addr: string | null;
  lat: number;
  lng: number;
  zcode: string;
  chger_type: string;
  stat: number;
  stat_upd_dt: Date | null;
}

export async function selectChargersInBbox(
  pool: Pool,
  filter: BboxFilter,
): Promise<SelectChargersInBboxResult> {
  const limit = filter.limit ?? DEFAULT_LIMIT;

  const result = await pool.query<ChargerMapDbRow>(
    `
    SELECT s.stat_id, s.name, s.addr, s.lat, s.lng, s.zcode,
           c.chger_id, c.chger_type, cs.stat, cs.stat_upd_dt
    FROM stations s
    JOIN chargers c ON c.stat_id = s.stat_id
    JOIN charger_status cs ON cs.stat_id = c.stat_id AND cs.chger_id = c.chger_id
    WHERE s.lng BETWEEN $1 AND $2
      AND s.lat BETWEEN $3 AND $4
      AND ($5::text IS NULL OR s.zcode = $5)
      AND ($6::text[] IS NULL OR c.chger_type = ANY($6::text[]))
      AND ($7::smallint[] IS NULL OR cs.stat = ANY($7::smallint[]))
      AND c.del_yn = false
    ORDER BY s.stat_id, c.chger_id
    LIMIT $8
    `,
    [
      filter.minLng,
      filter.maxLng,
      filter.minLat,
      filter.maxLat,
      filter.zcode ?? null,
      filter.chgerTypes ?? null,
      filter.stats ?? null,
      limit + 1,
    ],
  );

  const truncated = result.rows.length > limit;

  return {
    rows: result.rows.slice(0, limit).map((row) => ({
      statId: row.stat_id,
      chgerId: row.chger_id,
      name: row.name,
      addr: row.addr,
      lat: row.lat,
      lng: row.lng,
      zcode: row.zcode,
      chgerType: row.chger_type,
      stat: row.stat,
      statUpdDt: row.stat_upd_dt,
    })),
    truncated,
  };
}
