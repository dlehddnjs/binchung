import { describe, expect, it } from "vitest";
import { createFixturesChargerInfoSource } from "./chargerInfoSource.fixtures.js";

describe("createFixturesChargerInfoSource", () => {
  it("pageNo=1이면 getChargerInfo-normal.xml 내용을 반환한다", async () => {
    const source = createFixturesChargerInfoSource();
    const body = await source.fetchPage({ pageNo: 1, numOfRows: 10 });

    expect(body).toContain("<resultCode>00</resultCode>");
    expect(body).toContain("<totalCount>75389</totalCount>");
  });

  it("pageNo>1이면 getChargerInfo-empty.xml 내용을 반환한다 (자연스러운 페이지네이션 종료)", async () => {
    const source = createFixturesChargerInfoSource();
    const body = await source.fetchPage({ pageNo: 2, numOfRows: 10 });

    expect(body).toContain("<resultCode>00</resultCode>");
    expect(body).toContain("<items/>");
  });
});
