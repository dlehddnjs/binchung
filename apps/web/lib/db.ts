import { createPool } from "@binchung/db";
import type { Pool } from "pg";

// Next dev 모드 HMR이 이 모듈을 재평가하면 풀이 중복 생성될 수 있음 —
// 알려진 한계이나 Phase 1 범위에서는 해결하지 않는다.
let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
