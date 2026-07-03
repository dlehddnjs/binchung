const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const PATTERN = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/;

export function parseStatUpdDt(raw: string): Date | null {
  const match = PATTERN.exec(raw);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  const utcMs =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ) - KST_OFFSET_MS;

  return new Date(utcMs);
}
