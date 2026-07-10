import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseChargerInfoResponse } from "./parseChargerInfoResponse.js";

const fixturesDir = path.join(import.meta.dirname, "../../../../fixtures");

function loadFixture(name: string): string {
  return readFileSync(path.join(fixturesDir, name), "utf-8");
}

describe("parseChargerInfoResponse", () => {
  it("정상 응답을 파싱한다", () => {
    const xml = loadFixture("getChargerInfo-normal.xml");
    const result = parseChargerInfoResponse(xml);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.header.resultCode).toBe("00");
    expect(result.header.totalCount).toBe(75389);
    expect(result.items).toHaveLength(10);
    expect(result.skipped).toHaveLength(0);

    expect(result.items[0]).toEqual({
      statId: "ME174013",
      statNm: "낙성대동주민센터",
      addr: "서울특별시 관악구 낙성대로4가길 5",
      lat: 37.476296,
      lng: 126.9583876,
      zcode: "11",
      useTime: "24시간 이용가능",
      busiNm: "기후에너지환경부",
      chgerId: "01",
      chgerType: "06",
      outputKw: 50,
      stat: 2,
      statUpdDt: "20260703104804",
      delYn: false,
    });
  });

  it("빈 결과를 파싱한다 (items 빈 배열, totalCount는 보존)", () => {
    const xml = loadFixture("getChargerInfo-empty.xml");
    const result = parseChargerInfoResponse(xml);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.header.totalCount).toBe(75389);
    expect(result.items).toEqual([]);
  });

  it("비XML 응답(401 평문)은 NOT_XML 에러를 반환한다", () => {
    const xml = loadFixture("getChargerInfo-autherror.xml");
    const result = parseChargerInfoResponse(xml);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe("NOT_XML");
  });

  it("resultCode≠00 응답은 API_ERROR를 반환한다 (synthetic fixture)", () => {
    const xml = loadFixture("common-resultcode-error.synthetic.xml");
    const result = parseChargerInfoResponse(xml);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({
      type: "API_ERROR",
      resultCode: "22",
      resultMsg: "LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR",
    });
  });

  it("statId/chgerId가 없는 item은 건너뛴다", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg><totalCount>1</totalCount><pageNo>1</pageNo><numOfRows>1</numOfRows></header><body><items><item><statNm>이름만있음</statNm><lat>37.1</lat><lng>127.1</lng><stat>2</stat></item></items></body></response>`;
    const result = parseChargerInfoResponse(xml);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toEqual([]);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]?.index).toBe(0);
  });

  it("lat/lng가 숫자로 파싱되지 않는 item은 건너뛴다", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg><totalCount>1</totalCount><pageNo>1</pageNo><numOfRows>1</numOfRows></header><body><items><item><statId>X1</statId><chgerId>01</chgerId><lat>notanumber</lat><lng>127.1</lng><stat>2</stat></item></items></body></response>`;
    const result = parseChargerInfoResponse(xml);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toEqual([]);
    expect(result.skipped).toHaveLength(1);
  });

  it("미지의 stat 코드값은 걸러내지 않고 그대로 통과시킨다", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg><totalCount>1</totalCount><pageNo>1</pageNo><numOfRows>1</numOfRows></header><body><items><item><statId>X1</statId><chgerId>01</chgerId><lat>37.1</lat><lng>127.1</lng><stat>99</stat><statUpdDt>20260101000000</statUpdDt></item></items></body></response>`;
    const result = parseChargerInfoResponse(xml);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.stat).toBe(99);
  });

  it("delYn=Y인 항목은 delYn:true로 파싱한다", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg><totalCount>1</totalCount><pageNo>1</pageNo><numOfRows>1</numOfRows></header><body><items><item><statId>X1</statId><chgerId>01</chgerId><lat>37.1</lat><lng>127.1</lng><stat>2</stat><delYn>Y</delYn></item></items></body></response>`;
    const result = parseChargerInfoResponse(xml);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items[0]?.delYn).toBe(true);
  });

  it("delYn이 없거나 Y/N이 아니면 delYn:false로 취급한다", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg><totalCount>1</totalCount><pageNo>1</pageNo><numOfRows>1</numOfRows></header><body><items><item><statId>X1</statId><chgerId>01</chgerId><lat>37.1</lat><lng>127.1</lng><stat>2</stat></item></items></body></response>`;
    const result = parseChargerInfoResponse(xml);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items[0]?.delYn).toBe(false);
  });

  it('리터럴 "null" 문자열과 빈 문자열 필드는 빈 문자열로 정규화한다', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg><totalCount>1</totalCount><pageNo>1</pageNo><numOfRows>1</numOfRows></header><body><items><item><statId>X1</statId><chgerId>01</chgerId><statNm>테스트</statNm><addr>null</addr><lat>37.1</lat><lng>127.1</lng><stat>2</stat><useTime></useTime></item></items></body></response>`;
    const result = parseChargerInfoResponse(xml);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items[0]?.addr).toBe("");
    expect(result.items[0]?.useTime).toBe("");
  });
});
