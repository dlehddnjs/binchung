import { describe, expect, it } from "vitest";
import { createFixturesChargerStatusSource } from "./chargerStatusSource.fixtures.js";

describe("createFixturesChargerStatusSource", () => {
  it("pageNo=1이면 getChargerStatus-nozcode.xml 내용을 반환한다", async () => {
    const source = createFixturesChargerStatusSource();
    const body = await source.fetchPage({ pageNo: 1, numOfRows: 10, period: 5 });

    expect(body).toContain("<resultCode>00</resultCode>");
    expect(body).toContain("<totalCount>11800</totalCount>");
  });

  it("pageNo>1이면 getChargerStatus-empty.xml 내용을 반환한다 (자연스러운 페이지네이션 종료)", async () => {
    const source = createFixturesChargerStatusSource();
    const body = await source.fetchPage({ pageNo: 2, numOfRows: 10, period: 5 });

    expect(body).toContain("<resultCode>00</resultCode>");
    expect(body).toContain("<items/>");
  });
});
