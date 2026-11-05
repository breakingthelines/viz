/**
 * Formatting shared by every stats block: an ordinal percentile string and
 * a metric value string, both taken verbatim from the approved mock
 * (`scratchpad/prof/wheel2.py` — `ordinal`, `fmt`) so the numbers on the
 * page read exactly as the mock's.
 */

/** "1st", "2nd", "3rd", "4th", … — the 11th-13th exception included (mock: `ordinal`). */
export function ordinal(n: number): string {
  const r = n % 100;
  if (r >= 11 && r <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * Formats a metric's raw value for display: a `'percent'` unit rounds to a
 * whole number with a `%` suffix; a `'per90'` unit keeps two decimals
 * (mock: `fmt`, `PK`/`conv` round-and-percent, everything else `toFixed(2)`).
 * `null` (no data, §1.5) renders as an en dash, never a zero.
 */
export function formatMetricValue(value: number | null, unit: 'per90' | 'percent'): string {
  if (value === null || !Number.isFinite(value)) return '–';
  return unit === 'percent' ? `${Math.round(value)}%` : value.toFixed(2);
}

/** A percentile string for display, or an en dash when there is no rank. */
export function formatPercentile(percentile: number | null): string {
  return percentile === null || !Number.isFinite(percentile) ? '–' : ordinal(percentile);
}
