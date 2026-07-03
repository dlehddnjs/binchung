import { normalizeNullableString, toNumber } from "./coerce.js";
import { parseEnvelope } from "./envelope.js";
import type { ChargerStatusItem, ParseResult, SkippedItem } from "./types.js";

export function parseChargerStatusResponse(raw: string): ParseResult<ChargerStatusItem> {
  const envelopeResult = parseEnvelope(raw);
  if (!envelopeResult.ok) {
    return { ok: false, error: envelopeResult.error };
  }

  const { header, rawItems } = envelopeResult.envelope;
  const items: ChargerStatusItem[] = [];
  const skipped: SkippedItem[] = [];

  rawItems.forEach((rawItem, index) => {
    const statId = normalizeNullableString(rawItem.statId);
    const chgerId = normalizeNullableString(rawItem.chgerId);
    if (!statId || !chgerId) {
      skipped.push({ index, reason: "missing statId/chgerId" });
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
      stat,
      statUpdDt: normalizeNullableString(rawItem.statUpdDt) ?? "",
    });
  });

  return { ok: true, header, items, skipped };
}
