import type { ChargerSpeed } from "./types.js";

const SLOW = new Set(["02", "08"]);
const FAST = new Set(["01", "03", "04", "05", "06", "07", "09", "10", "11"]);

export function classifyChargerSpeed(chgerType: string): ChargerSpeed {
  const trimmed = chgerType.trim();
  if (SLOW.has(trimmed)) return "slow";
  if (FAST.has(trimmed)) return "fast";
  return "unknown";
}
