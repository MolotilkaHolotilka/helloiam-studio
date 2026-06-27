export function formatStatDelta(current: number, previous: number | null | undefined): string | null {
  if (previous === null || previous === undefined) return null;
  const delta = current - previous;
  if (delta === 0) return 'без изм.';
  if (delta > 0) return `+${formatDeltaValue(delta)}`;
  return formatDeltaValue(delta);
}

function formatDeltaValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 10_000) return `${Math.round(value / 1000)}K`;
  if (abs >= 1_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

export function getPreviousListDate(dates: string[], current: string): string | null {
  const sorted = [...dates].sort((a, b) => a.localeCompare(b));
  const index = sorted.indexOf(current);
  if (index <= 0) return null;
  return sorted[index - 1];
}
