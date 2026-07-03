import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createLiveChargerStatusSource } from "./chargerStatusSource.live.js";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const ENDPOINT = "http://apis.data.go.kr/B552584/EvCharger/getChargerStatus";

describe("createLiveChargerStatusSource", () => {
  it("serviceKey/pageNo/numOfRows/period를 쿼리로 넘기고 응답 본문을 그대로 반환한다", async () => {
    server.use(
      http.get(ENDPOINT, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("serviceKey")).toBe("TEST_KEY");
        expect(url.searchParams.get("pageNo")).toBe("1");
        expect(url.searchParams.get("numOfRows")).toBe("9999");
        expect(url.searchParams.get("period")).toBe("5");
        return HttpResponse.text("<response>ok</response>");
      }),
    );

    const source = createLiveChargerStatusSource({ serviceKey: "TEST_KEY" });
    const body = await source.fetchPage({ pageNo: 1, numOfRows: 9999, period: 5 });

    expect(body).toBe("<response>ok</response>");
  });

  it("zcode가 없으면 쿼리에 포함하지 않는다 (전국 조회)", async () => {
    server.use(
      http.get(ENDPOINT, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.has("zcode")).toBe(false);
        return HttpResponse.text("ok");
      }),
    );

    const source = createLiveChargerStatusSource({ serviceKey: "TEST_KEY" });
    await source.fetchPage({ pageNo: 1, numOfRows: 10, period: 5 });
  });

  it("HTTP 상태코드와 무관하게 응답 본문을 그대로 반환한다", async () => {
    server.use(http.get(ENDPOINT, () => new HttpResponse("Gateway Timeout", { status: 504 })));

    const source = createLiveChargerStatusSource({ serviceKey: "TEST_KEY" });
    const body = await source.fetchPage({ pageNo: 1, numOfRows: 10, period: 5 });

    expect(body).toBe("Gateway Timeout");
  });
});
