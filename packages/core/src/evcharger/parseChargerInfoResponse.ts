import { normalizeNullableString, toNumber } from "./coerce.js";
import { parseEnvelope } from "./envelope.js";
import type { ChargerInfoItem, ParseResult, SkippedItem } from "./types.js";

export function parseChargerInfoResponse(raw: string): ParseResult<ChargerInfoItem> {
  const envelopeResult = parseEnvelope(raw);
  if (!envelopeResult.ok) {
    return { ok: false, error: envelopeResult.error };
  }

  const { header, rawItems } = envelopeResult.envelope;
  const items: ChargerInfoItem[] = [];
  const skipped: SkippedItem[] = [];

  rawItems.forEach((rawItem, index) => {
    const statId = normalizeNullableString(rawItem.statId);
    const chgerId = normalizeNullableString(rawItem.chgerId);
    if (!statId || !chgerId) {
      skipped.push({ index, reason: "missing statId/chgerId" });
      return;
    }

    const lat = toNumber(rawItem.lat);
    const lng = toNumber(rawItem.lng);
    if (lat === null || lng === null) {
      skipped.push({ index, reason: "unparseable lat/lng" });
      return;
    }

    const stat = toNumber(rawItem.stat);
    if (stat === null) {
      skipped.push({ index, reason: "missing/unparseable stat" });
      return;
    }

    items.push({
      statId,
      chgerId,
      statNm: normalizeNullableString(rawItem.statNm) ?? "",
      addr: normalizeNullableString(rawItem.addr) ?? "",
      lat,
      lng,
      zcode: normalizeNullableString(rawItem.zcode) ?? "",
      useTime: normalizeNullableString(rawItem.useTime) ?? "",
      busiNm: normalizeNullableString(rawItem.busiNm) ?? "",
      chgerType: normalizeNullableString(rawItem.chgerType) ?? "",
      outputKw: toNumber(rawItem.output),
      stat,
      statUpdDt: normalizeNullableString(rawItem.statUpdDt) ?? "",
      delYn: normalizeNullableString(rawItem.delYn) === "Y",
    });
  });

  return { ok: true, header, items, skipped };
}
