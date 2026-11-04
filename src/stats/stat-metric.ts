/**
 * Plain-data metric shape shared by the profile stat charts (spec §4.1).
 * No protos: a caller adapts its RPC response into this.
 */

/**
 * `value`: a percentile is known. `no-data`: the provider reported nothing
 * for this league-season. `pending` and `locked`: an event metric that is
 * licensed but not yet computed, or that the viewer's tier cannot see. A
 * metric that is not licensed at all is never passed.
 */
export type MetricState = 'value' | 'no-data' | 'pending' | 'locked';

export interface StatMetric {
  /** Registry key, for example `npg`. */
  key: string;
  /** Long label, for example "Non-penalty goals". */
  label: string;
  /** Short label for narrow widths, for example "npG". */
  shortLabel: string;
  /** Group name, for example "Shooting". */
  group: string;
  unit: 'per90' | 'percent';
  value: number | null;
  /** 0 to 100. */
  percentile: number | null;
  median: number | null;
  state: MetricState;
  /**
   * The key archetypes focus this metric by, when it differs from `key`
   * (for example a possession-adjusted variant focused through its base key).
   */
  focusKey?: string;
}
