import type { Pool } from "pg";
import type { StationRow } from "./types.js";

const COLUMNS = ["stat_id", "name", "addr", "lat", "lng", "zcode", "use_time", "busi_nm"] as const;

export interface UpsertOptions {
  chunkSize?: number;
}

export async function upsertStations(
  pool: Pool,
  rows: StationRow[],
  opts: UpsertOptions = {},
): Promise<void> {
  const chunkSize = opts.chunkSize ?? 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    await upsertChunk(pool, rows.slice(i, i + chunkSize));
  }
}

async function upsertChunk(pool: Pool, rows: StationRow[]): Promise<void> {
  if (rows.length === 0) return;

  const values: unknown[] = [];
  const placeholders = rows.map((row, i) => {
    const base = i * COLUMNS.length;
    values.push(row.statId, row.name, row.addr, row.lat, row.lng, row.zcode, row.useTime, row.busiNm);
    return `(${COLUMNS.map((_, j) => `$${base + j + 1}`).join(", ")})`;
  });

  await pool.query(
    `
    INSERT INTO stations (${COLUMNS.join(", ")})
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (stat_id) DO UPDATE SET
      name = EXCLUDED.name,
      addr = EXCLUDED.addr,
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng,
      zcode = EXCLUDED.zcode,
      use_time = EXCLUDED.use_time,
      busi_nm = EXCLUDED.busi_nm,
      updated_at = now()
    `,
    values,
  );
}
