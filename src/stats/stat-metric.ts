/**
 * Plain-data shapes shared by the profile stat charts (spec §4.1).
 * No protos: a caller adapts its RPC response into these.
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
   * The registry's `focus_key`: the wheel metric this one highlights as,
   * when it differs from `key`. Set on a variant that is never on the wheel,
   * for example `tkl_padj` with `focusKey: 'tkl'`; wheel metrics such as
   * `tkl` and `int` leave it unset. Charts match a focused key against
   * `focusKey ?? key`, so callers resolve an archetype's metric keys through
   * the registry before passing them as `focusKeys`.
   */
  focusKey?: string;
}

/** A team, competition or player mention that links to its BTL entity page
 * (spec §4.2 "Entity links"). `href` is optional only for a provider id
 * identity has not resolved yet; once a `SubjectRef` resolves, the caller
 * always passes it (spec §4.1). */
export interface EntityLink {
  label: string;
  href?: string;
}
