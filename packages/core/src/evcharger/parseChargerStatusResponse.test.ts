import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseChargerStatusResponse } from "./parseChargerStatusResponse.js";

const fixturesDir = path.join(import.meta.dirname, "../../../../fixtures");

function loadFixture(name: string): string {
  return readFileSync(path.join(fixturesDir, name), "utf-8");
}

describe("parseChargerStatusResponse", () => {
  it("정상 응답을 파싱한다 (zcode 지정)", () => {
    const xml = loadFixture("getChargerStatus-normal.xml");
    const result = parseChargerStatusResponse(xml);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.header.resultCode).toBe("00");
    expect(result.header.totalCount).toBe(1706);
    expect(result.items).toHaveLength(10);
    expect(result.skipped).toHaveLength(0);

    expect(result.items[0]).toEqual({
      statId: "ME174013",
      chgerId: "01",
      stat: 2,
      statUpdDt: "20260703105806",
    });
  });

  it("zcode 생략(전국 조회) 응답도 동일 스키마로 파싱한다", () => {
    const xml = loadFixture("getChargerStatus-nozcode.xml");
    const result = parseChargerStatusResponse(xml);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.header.totalCount).toBe(11800);
    expect(result.items).toHaveLength(10);
    expect(result.items[0]?.statId).toBe("ME174013");
  });

  it("비XML 응답(504 HTML)은 NOT_XML 에러를 반환한다", () => {
    const xml = loadFixture("getChargerStatus-error.xml");
    const result = parseChargerStatusResponse(xml);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe("NOT_XML");
  });

  it("resultCode≠00 응답은 API_ERROR를 반환한다 (synthetic fixture)", () => {
    const xml = loadFixture("common-resultcode-error.synthetic.xml");
    const result = parseChargerStatusResponse(xml);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({
      type: "API_ERROR",
      resultCode: "22",
      resultMsg: "LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR",
    });
  });

  it("statId/chgerId가 없는 item은 건너뛴다", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg><totalCount>1</totalCount><pageNo>1</pageNo><numOfRows>1</numOfRows></header><body><items><item><stat>2</stat><statUpdDt>20260101000000</statUpdDt></item></items></body></response>`;
    const result = parseChargerStatusResponse(xml);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toEqual([]);
    expect(result.skipped).toHaveLength(1);
  });

  it("스키마 밖 필드(nowTsdt 등)는 출력에 포함하지 않는다", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg><totalCount>1</totalCount><pageNo>1</pageNo><numOfRows>1</numOfRows></header><body><items><item><busiId>ME</busiId><statId>X1</statId><chgerId>01</chgerId><stat>3</stat><statUpdDt>20260101000000</statUpdDt><lastTsdt>20260101000000</lastTsdt><lastTedt>20260101000000</lastTedt><nowTsdt>20260101000000</nowTsdt></item></items></body></response>`;
    const result = parseChargerStatusResponse(xml);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items[0]).not.toHaveProperty("nowTsdt");
    expect(result.items[0]).not.toHaveProperty("busiId");
    expect(result.items[0]).toEqual({
      statId: "X1",
      chgerId: "01",
      stat: 3,
      statUpdDt: "20260101000000",
    });
  });
});
