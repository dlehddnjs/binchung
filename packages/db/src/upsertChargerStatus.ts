import type { Pool } from "pg";
import type { ChargerStatusRow } from "./types.js";
import type { UpsertOptions } from "./upsertStations.js";

const COLUMNS = ["stat_id", "chger_id", "stat", "stat_upd_dt"] as const;

export async function upsertChargerStatus(
  pool: Pool,
  rows: ChargerStatusRow[],
  opts: UpsertOptions = {},
): Promise<void> {
  const chunkSize = opts.chunkSize ?? 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    await upsertChunk(pool, rows.slice(i, i + chunkSize));
  }
}

async function upsertChunk(pool: Pool, rows: ChargerStatusRow[]): Promise<void> {
  if (rows.length === 0) return;

  const values: unknown[] = [];
  const placeholders = rows.map((row, i) => {
    const base = i * COLUMNS.length;
    values.push(row.statId, row.chgerId, row.stat, row.statUpdDt);
    return `(${COLUMNS.map((_, j) => `$${base + j + 1}`).join(", ")}, now())`;
  });

  await pool.query(
    `
    INSERT INTO charger_status (${COLUMNS.join(", ")}, seen_at)
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (stat_id, chger_id) DO UPDATE SET
      stat = EXCLUDED.stat,
      stat_upd_dt = EXCLUDED.stat_upd_dt,
      seen_at = now()
    `,
    values,
  );
}
