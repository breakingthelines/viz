/**
 * Shared types for `@breakingthelines/viz/stats` (spec §4.1). Every stat
 * block below takes these as plain props — no fetching, no store, so the
 * same shapes serve the platform page, the free-tier grid and a social-card
 * export.
 */

/** A team, competition or player mention that links to its BTL entity page
 * (spec §4.2 "Entity links"). `href` is optional only for a provider id
 * identity has not resolved yet; once a `SubjectRef` resolves, the caller
 * always passes it (spec §4.1). */
export interface EntityLink {
  label: string;
  href?: string;
}

/**
 * A metric's availability (spec §3.1, `ArchetypeTier`/`MetricState`):
 * - `value` — a real number, percentile and median are present.
 * - `no-data` — computed for this competition/season but absent for this
 *   player (§1.5's null-vs-zero rule; never rendered as a zero).
 * - `pending` — an event-only metric in a league that does not have event
 *   data yet. Renders dashed, last, muted, with no number (spec §4.5: no
 *   placeholder copy).
 * - `locked` — gated behind a paid tier. A `not-licensed` metric is never
 *   sent to the client at all (viz has no state for it).
 */
export type MetricState = 'value' | 'no-data' | 'pending' | 'locked';

/** One per-90 or percent metric, already resolved against a comparison
 * group (spec §4.1 `StatMetric`). */
export interface StatMetric {
  /** BTL's own registry key (`npg`, `key`, `prgp`, …) — never a provider field. */
  key: string;
  /** Full label, e.g. "Non-penalty goals". */
  label: string;
  /** Short label for narrow layouts. */
  shortLabel: string;
  /** Metric group, e.g. "Shooting", "Creating". */
  group: string;
  unit: 'per90' | 'percent';
  value: number | null;
  /** Ordinal rank, 0-100, against the resolved comparison group. */
  percentile: number | null;
  /** The group's median value, already formatted for display (e.g. "1.42"). */
  median: number | null;
  state: MetricState;
  /** The key a hover/select on this metric should focus elsewhere (e.g. on
   * the wheel). Defaults to `key` when omitted. */
  focusKey?: string;
}
