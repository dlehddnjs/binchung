import { XMLParser } from "fast-xml-parser";
import type { ParseError, ResponseHeader } from "./types.js";

const parser = new XMLParser({
  parseTagValue: false,
  isArray: (_name, jpath) => jpath === "response.body.items.item",
});

export interface RawEnvelope {
  header: ResponseHeader;
  rawItems: Record<string, unknown>[];
}

export type EnvelopeResult =
  | { ok: true; envelope: RawEnvelope }
  | { ok: false; error: ParseError };

function looksLikeXml(raw: string): boolean {
  const trimmed = raw.trimStart();
  return trimmed.startsWith("<?xml") || trimmed.startsWith("<response");
}

export function parseEnvelope(raw: string): EnvelopeResult {
  if (!looksLikeXml(raw)) {
    return { ok: false, error: { type: "NOT_XML", raw: raw.slice(0, 200) } };
  }

  let parsed: unknown;
  try {
    parsed = parser.parse(raw);
  } catch (cause) {
    return {
      ok: false,
      error: { type: "MALFORMED_XML", raw: raw.slice(0, 200), cause },
    };
  }

  const response = (parsed as Record<string, unknown>)?.response as
    | Record<string, unknown>
    | undefined;
  const header = response?.header as Record<string, unknown> | undefined;
  const resultCode = String(header?.resultCode ?? "");
  const resultMsg = String(header?.resultMsg ?? "");

  if (resultCode !== "00") {
    return { ok: false, error: { type: "API_ERROR", resultCode, resultMsg } };
  }

  const body = response?.body as Record<string, unknown> | undefined;
  const items = body?.items as Record<string, unknown> | undefined;
  const rawItems = (items?.item as Record<string, unknown>[] | undefined) ?? [];

  return {
    ok: true,
    envelope: {
      header: {
        resultCode,
        resultMsg,
        totalCount: Number(header?.totalCount ?? 0),
        pageNo: Number(header?.pageNo ?? 0),
        numOfRows: Number(header?.numOfRows ?? 0),
      },
      rawItems,
    },
  };
}
