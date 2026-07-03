export function makeChargerKey(statId: string, chgerId: string): string {
  return `${encodeURIComponent(statId)}:${encodeURIComponent(chgerId)}`;
}
