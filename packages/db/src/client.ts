import { Pool } from "pg";

export function createPool(connectionString?: string): Pool {
  const pool = new Pool({ connectionString: connectionString ?? process.env.DATABASE_URL });
  // idle 상태 커넥션에서 네트워크 레벨 에러가 나면 pg.Pool은 pool 자체에 'error'를
  // emit한다 — 리스너가 없으면 EventEmitter가 uncaught exception으로 던져 collector
  // 같은 장수 프로세스 전체가 죽는다. 폴링 실패는 다음 주기로 자연 복구한다는
  // 설계 의도(CLAUDE.md/§3)를 지키려면 여기서 반드시 받아야 한다.
  pool.on("error", (error: unknown) => {
    console.error("pg pool error:", error);
  });
  return pool;
}
