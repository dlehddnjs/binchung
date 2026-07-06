// @vitest-environment jsdom
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { fetchChargers } from "./fetchChargers";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const BBOX = { minLng: 126.9, minLat: 37.4, maxLng: 127.2, maxLat: 37.7 };

describe("fetchChargers", () => {
  it("/api/chargers를 bbox 쿼리스트링으로 호출하고 JSON을 그대로 반환한다", async () => {
    server.use(
      http.get("http://localhost/api/chargers", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("bbox")).toBe("126.9,37.4,127.2,37.7");
        return HttpResponse.json({ chargers: [], truncated: false });
      }),
    );

    const result = await fetchChargers({ bbox: BBOX });

    expect(result).toEqual({ chargers: [], truncated: false });
  });

  it("응답이 실패하면 에러를 던진다", async () => {
    server.use(http.get("http://localhost/api/chargers", () => new HttpResponse(null, { status: 400 })));

    await expect(fetchChargers({ bbox: BBOX })).rejects.toThrow("400");
  });
});
