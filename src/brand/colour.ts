/**
 * Percentile colour ramp (profile build, spec §2.7).
 *
 * `ramp(p, target)` maps a percentile (0-100, or `null` for no data) to a hex
 * colour on a continuous curve from a muted base grey up to full strength at
 * the 90th percentile — never further, and never printed as a threshold
 * anywhere the colour itself is shown. The subject ramps to BTL data red
 * (`#eb0000`, the profile ramp's red — distinct from `BTL_RED` on the mark
 * and wordmark, `#E20613`); a comparison player ramps to white.
 *
 * Geometry is taken verbatim from the approved mock
 * (`scratchpad/prof/wheel2.py` — `ramp`/`colour`/`colour_w`), so a percentile
 * painted by this function matches the mock pixel for pixel.
 */

/** Percentile at which the ramp reaches full strength. Never surfaced in copy. */
const FULL_STRENGTH_PERCENTILE = 90;

/** Ramp curve exponent (mock: `** 1.6`). */
const EXPONENT = 1.6;

/** The muted grey every percentile ramps from (mock: `BASE = (58, 54, 54)`). */
const BASE: readonly [number, number, number] = [58, 54, 54];

/** Full-strength colour for the subject (mock: `ramp(p)`, `to=(235, 0, 0)` = `#eb0000`). */
const SUBJECT_TARGET: readonly [number, number, number] = [235, 0, 0];

/** Full-strength colour for a comparison player (mock: `colour_w`, `to=(255, 255, 255)`). */
const COMPARISON_TARGET: readonly [number, number, number] = [255, 255, 255];

function clamp01(n: number): number {
  return Math.min(Math.max(n, 0), 1);
}

function toHex(channel: number): string {
  return Math.round(channel).toString(16).padStart(2, '0');
}

/**
 * Ramp a percentile to its colour. `p` of `null` (no data) renders at the
 * ramp's base grey, same as `p = 0`.
 *
 * `target` picks which full-strength colour the ramp runs to: `'subject'`
 * for the profile's own player (full BTL red at the 90th percentile and
 * above), `'comparison'` for a compared player (full white).
 */
export function ramp(p: number | null, target: 'subject' | 'comparison'): string {
  const to = target === 'subject' ? SUBJECT_TARGET : COMPARISON_TARGET;
  // A non-finite p (NaN, from §3.5's server-side null-as-NaN convention, or
  // from a proto JSON "NaN" string parsed into a number) is treated the same
  // as `null` — the base grey — rather than producing an invalid colour
  // (`#NaNNaNNaN`). `p ?? 0` alone does not catch this: `??` only substitutes
  // on `null`/`undefined`, and `NaN` is neither.
  const safeP = p !== null && Number.isFinite(p) ? p : 0;
  const t = clamp01(safeP / FULL_STRENGTH_PERCENTILE) ** EXPONENT;
  const [r, g, b] = BASE.map((base, i) => base + (to[i] - base) * t);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Maps a match rating (roughly 0-10) to the subject ramp colour (mock:
 * `rating_colour`, `scratchpad/prof/page2.py:46`): clamps `(r - 6) / 2` to
 * `0..1` and scales it to `0..90` before ramping, so a rating of 6 or below
 * sits at the base grey and 8 or above reaches full BTL red.
 */
export function ratingColour(r: number): string {
  return ramp(clamp01((r - 6) / 2) * FULL_STRENGTH_PERCENTILE, 'subject');
}
