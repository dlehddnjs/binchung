import { selectChargersInBbox } from "@binchung/db";
import type { Pool } from "pg";
import { parseChargersQuery } from "./parseChargersQuery";

export interface ChargersRequestDeps {
  pool: Pool;
}

export async function handleChargersRequest(
  request: Request,
  deps: ChargersRequestDeps,
): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseChargersQuery(url.searchParams);

  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { rows, truncated } = await selectChargersInBbox(deps.pool, parsed.filter);

  return Response.json({ chargers: rows, truncated });
}
