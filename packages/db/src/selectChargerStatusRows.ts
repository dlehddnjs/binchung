import type { Pool } from "pg";
import type { ChargerStatusKey } from "./types.js";

export interface SelectedChargerStatusRow {
  statId: string;
  chgerId: string;
  stat: number;
}

export async function selectChargerStatusRows(
  pool: Pool,
  keys: ChargerStatusKey[],
): Promise<SelectedChargerStatusRow[]> {
  if (keys.length === 0) return [];

  const statIds = keys.map((key) => key.statId);
  const chgerIds = keys.map((key) => key.chgerId);

  const result = await pool.query(
    `
    SELECT stat_id, chger_id, stat
    FROM charger_status
    WHERE (stat_id, chger_id) IN (
      SELECT * FROM unnest($1::text[], $2::text[])
    )
    `,
    [statIds, chgerIds],
  );

  return result.rows.map((row: { stat_id: string; chger_id: string; stat: number }) => ({
    statId: row.stat_id,
    chgerId: row.chger_id,
    stat: row.stat,
  }));
}
