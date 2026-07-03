import type { Pool } from "pg";
import type { ChargerRow } from "./types.js";
import type { UpsertOptions } from "./upsertStations.js";

const COLUMNS = ["stat_id", "chger_id", "chger_type", "output_kw"] as const;

export async function upsertChargers(
  pool: Pool,
  rows: ChargerRow[],
  opts: UpsertOptions = {},
): Promise<void> {
  const chunkSize = opts.chunkSize ?? 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    await upsertChunk(pool, rows.slice(i, i + chunkSize));
  }
}

async function upsertChunk(pool: Pool, rows: ChargerRow[]): Promise<void> {
  if (rows.length === 0) return;

  const values: unknown[] = [];
  const placeholders = rows.map((row, i) => {
    const base = i * COLUMNS.length;
    values.push(row.statId, row.chgerId, row.chgerType, row.outputKw);
    return `(${COLUMNS.map((_, j) => `$${base + j + 1}`).join(", ")})`;
  });

  await pool.query(
    `
    INSERT INTO chargers (${COLUMNS.join(", ")})
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (stat_id, chger_id) DO UPDATE SET
      chger_type = EXCLUDED.chger_type,
      output_kw = EXCLUDED.output_kw
    `,
    values,
  );
}
