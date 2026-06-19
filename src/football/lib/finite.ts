/**
 * Finite-number guards for SVG geometry.
 *
 * Block data arrives from hosts (the editor's baked block data, live provider
 * feeds) that can be sparse or partial: a missing `x`, an absent `xg`, an empty
 * sample set. Coordinate and radius maths then quietly produces `NaN`
 * (`undefined * 100`, `Math.max(0, Math.min(1, undefined))`) or non-finite
 * values (`Math.max(...[])` → `-Infinity`, `x / 0` → `Infinity`). Feeding any of
 * those into an SVG `cx` / `cy` / `r` attribute makes React emit a runtime
 * console error — e.g. `<circle> attribute r: Expected length, "undefined"` —
 * and the marker renders nowhere.
 *
 * These helpers collapse any non-finite value to a safe fallback so a block
 * rendered with empty or partial data never produces a broken attribute. They
 * are the floor under every data-derived geometry value in the football blocks;
 * the shared SVG primitives ({@link SvgHeadshot}, {@link PlayerMarker}) also
 * apply them as a last-line backstop.
 */

/**
 * Return `value` when it is a finite number, otherwise `fallback` (default `0`).
 * Guards every coordinate / length that is derived from data or arithmetic.
 */
export function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Return `value` when it is a finite, strictly positive number, otherwise
 * `fallback`. Use for SVG radii and any other length that must be `> 0` (a `0`
 * or negative radius is itself an invalid/empty marker).
 */
export function finitePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
