/**
 * The shared "a chart is a control surface" contract for the football blocks.
 *
 * Every selectable block reports its selection through `onSelectionChange`. The
 * block-specific fields differ (a shot map filters by side and shooter name, a
 * pass network by player id), so each payload also carries a common
 * {@link SelectionSubject}: who and which team the block is showing after the
 * change, resolved by the block from its own data. A host (Studio, the
 * platform, an MCP App reporting back to a model) can read `subject` without
 * knowing each block's shape.
 *
 * Blocks whose items carry a match minute also take a {@link MinuteWindow} and
 * filter to it themselves.
 */

/** Who and which team a block is showing. Every field is `null` when not applicable. */
export interface SelectionSubject {
  /**
   * Stable id of the player in focus, when the block's data carries one. `null`
   * for a whole-team view, or when the data only names players.
   */
  playerId: string | null;
  /** Display name of the player in focus, or `null` for a whole-team view. */
  playerName: string | null;
  /**
   * Display name of the team the block is showing (e.g. "Argentina"), resolved
   * from the block's own team props. `null` when the block shows both sides at
   * once, or has no team names to resolve to.
   */
  team: string | null;
}

/** A block's selection as reported by `onSelectionChange`: its own fields plus `subject`. */
export type SelectionChange<T> = T & {
  /** Who and which team the block shows after this change. */
  subject: SelectionSubject;
};

/** The subject of a block with no player in focus and no team to name. */
export const EMPTY_SUBJECT: SelectionSubject = Object.freeze({
  playerId: null,
  playerName: null,
  team: null,
});

/** Build a {@link SelectionSubject}, defaulting every missing field to `null`. */
export function selectionSubject(fields: Partial<SelectionSubject> = {}): SelectionSubject {
  return {
    playerId: fields.playerId ?? null,
    playerName: fields.playerName ?? null,
    team: fields.team ?? null,
  };
}

/** A match-minute range, inclusive at both ends. */
export interface MinuteWindow {
  /** First minute shown (inclusive). */
  from: number;
  /** Last minute shown (inclusive). */
  to: number;
}

/**
 * Normalise a window: swaps reversed bounds and drops a window with a
 * non-finite bound (treated as no window, so bad input never empties a block).
 */
export function normalizeWindow(window: MinuteWindow | undefined): MinuteWindow | undefined {
  if (!window) return undefined;
  const { from, to } = window;
  if (!Number.isFinite(from) || !Number.isFinite(to)) return undefined;
  return from <= to ? { from, to } : { from: to, to: from };
}

/** True when `minute` falls inside `window` (inclusive). No window admits every minute. */
export function inMinuteWindow(minute: number, window: MinuteWindow | undefined): boolean {
  const w = normalizeWindow(window);
  if (!w) return true;
  return Number.isFinite(minute) && minute >= w.from && minute <= w.to;
}

/**
 * Keep the items whose minute falls inside `window`. Returns the input array
 * itself (same reference) when there is no window, so memoised consumers don't
 * recompute.
 */
export function filterByMinute<T>(
  items: readonly T[],
  minuteOf: (item: T) => number,
  window: MinuteWindow | undefined
): T[] {
  const w = normalizeWindow(window);
  if (!w) return items as T[];
  return items.filter((item) => inMinuteWindow(minuteOf(item), w));
}

/**
 * Structural equality for selection objects (plain objects, arrays and
 * primitives). Used to drop change notifications that would report the same
 * selection twice, e.g. re-picking the option that is already selected.
 */
export function sameSelection(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  if (ka.length !== kb.length) return false;
  return ka.every((k) =>
    sameSelection((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
  );
}

/**
 * Drop a `subject` field from a seed. A host may store a reported selection and
 * pass it back as `initialSelection`; the block resolves `subject` itself, so a
 * stored one is ignored rather than carried in state.
 */
export function withoutSubject<T>(value: T): T {
  if (typeof value !== 'object' || value === null || !('subject' in value)) return value;
  const { subject: _subject, ...rest } = value as T & { subject?: unknown };
  return rest as T;
}
