import type { Pool } from "pg";
import type { StatusHistoryRow } from "./types.js";
import type { UpsertOptions } from "./upsertStations.js";

const COLUMNS = ["stat_id", "chger_id", "prev_stat", "next_stat", "stat_upd_dt"] as const;

export async function insertStatusHistory(
  pool: Pool,
  rows: StatusHistoryRow[],
  opts: UpsertOptions = {},
): Promise<void> {
  const chunkSize = opts.chunkSize ?? 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    await insertChunk(pool, rows.slice(i, i + chunkSize));
  }
}

async function insertChunk(pool: Pool, rows: StatusHistoryRow[]): Promise<void> {
  if (rows.length === 0) return;

  const values: unknown[] = [];
  const placeholders = rows.map((row, i) => {
    const base = i * COLUMNS.length;
    values.push(row.statId, row.chgerId, row.prevStat, row.nextStat, row.statUpdDt);
    return `(${COLUMNS.map((_, j) => `$${base + j + 1}`).join(", ")})`;
  });

  await pool.query(
    `
    INSERT INTO status_history (${COLUMNS.join(", ")})
    VALUES ${placeholders.join(", ")}
    `,
    values,
  );
}
