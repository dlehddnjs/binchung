// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { createElement, type ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { useChargersFeed } from "./useChargersFeed";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => server.close());

const BBOX = { minLng: 126.9, minLat: 37.4, maxLng: 127.2, maxLat: 37.7 };

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useChargersFeed", () => {
  it("성공하면 chargers/truncated와 status=success를 반환한다", async () => {
    server.use(
      http.get("*/api/chargers", () =>
        HttpResponse.json({ chargers: [{ statId: "ST1" }], truncated: false }),
      ),
    );

    const { result } = renderHook(() => useChargersFeed({ bbox: BBOX }), {
      wrapper: createWrapper(),
    });

    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("success"));

    expect(result.current.chargers).toEqual([{ statId: "ST1" }]);
    expect(result.current.truncated).toBe(false);
  });

  it("initialData가 있으면 첫 렌더부터 success 상태다", () => {
    const { result } = renderHook(
      () =>
        useChargersFeed(
          { bbox: BBOX },
          { initialData: { chargers: [], truncated: false } },
        ),
      { wrapper: createWrapper() },
    );

    expect(result.current.status).toBe("success");
  });

  it("응답이 실패하면 status=error를 반환한다", async () => {
    server.use(http.get("*/api/chargers", () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHook(() => useChargersFeed({ bbox: BBOX }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("60초 주기로 재요청한다 (refetchInterval)", async () => {
    let callCount = 0;
    server.use(
      http.get("*/api/chargers", () => {
        callCount += 1;
        return HttpResponse.json({ chargers: [], truncated: false });
      }),
    );

    const { result } = renderHook(() => useChargersFeed({ bbox: BBOX }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(callCount).toBe(1);

    vi.useFakeTimers();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(callCount).toBe(2);
  });
});
