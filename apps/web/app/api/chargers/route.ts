import { getPool } from "../../../lib/db";
import { handleChargersRequest } from "./handleChargersRequest";

// request.url의 쿼리스트링으로 응답이 매번 달라지므로, Next 버전 캐싱 휴리스틱에
// 기대지 않고 동적 렌더링을 명시적으로 고정한다.
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleChargersRequest(request, { pool: getPool() });
}
