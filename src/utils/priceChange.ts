export function changePercent(
  current: number | undefined | null,
  previous: number | undefined | null,
): number | undefined {
  if (current == null || previous == null || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}
