import type { CSSProperties } from 'react';

/**
 * Vertical text trimming — the thing that makes the social card's Figma
 * geometry actually land where the file draws it.
 *
 * Every text layer in the lineup card's Figma file (`e5dghsmu54gH7g6KumhS0Q`,
 * frames 3048:11243 / 3048:11311 / 3049:11491 / 3049:11549) carries
 * `text-box-trim: trim-both` + `text-box-edge: cap alphabetic`, i.e. the
 * layer's box hugs the CAP HEIGHT at the top and the ALPHABETIC BASELINE at
 * the bottom, with the font's ascender gap and descender space cropped away.
 * That is not cosmetic: the card is a stack of `justify-between` /
 * fixed-gap flex boxes, so every one of those cropped half-leadings would
 * otherwise accumulate. Rendered untrimmed, the square frame's pitch slot
 * measures ~48px shorter than the 734px the file draws, and every gap in the
 * card drifts.
 *
 * The obvious implementation is the real CSS property (`text-box: trim-both
 * cap alphabetic`), but it is Chromium-only. This composition is a PUBLISHED
 * library component that hosts render in whatever browser the reader brought,
 * and its whole job is to rasterise to an exact-size PNG — a layout that
 * silently loosens on Firefox/Safari would produce a differently-composed
 * card for those users. So the trim is reproduced with plain negative block
 * margins, which behave identically everywhere.
 *
 * ## Why negative margins reproduce it exactly
 *
 * For an element of `n` lines at line-height `L` (em), with the font's
 * ascent `A`, descent `D` and cap height `C`:
 *
 * - half-leading `h = (L - (A + D)) / 2`
 * - line 1's cap top sits `h + (A - C)` below the box top
 * - line n's baseline sits `L * (n - 1) + h + A` below the box top
 * - the box itself is `L * n` tall
 *
 * so the top overhang is `h + (A - C)` and the bottom overhang is
 * `L * n - (L * (n - 1) + h + A)` = `L - h - A` = `h + D`. Because Inter's
 * `A - C` (0.2413em) and `D` (0.2412em) are the same number to within a
 * thousandth of an em, BOTH overhangs are the same value — and, critically,
 * that value is independent of `n`. One symmetric negative margin therefore
 * trims a one-line eyebrow and a two-line headline correctly with no
 * per-element line counting.
 *
 * Verified against the Figma render rather than asserted: the square pitch
 * frame's pitch slot is drawn at exactly 515x734px, and this trim reproduces
 * that slot to the pixel (see `lineup-card.stories.tsx`).
 */

/** Inter's hhea ascender, 1984/2048 em. */
const INTER_ASCENT = 0.9688;
/** Inter's hhea descender, 494/2048 em. */
const INTER_DESCENT = 0.2412;
/** Inter's cap height, 1490/2048 em. */
const INTER_CAP_HEIGHT = 0.7275;

/**
 * Inter's `line-height: normal` as a multiple of font size (ascent + descent,
 * Inter ships no line gap). Pinned as a NUMBER rather than left as the
 * `normal` keyword so the box math stays identical when a host falls back to
 * a system sans — only the glyphs inside shift, never the layout.
 */
export const INTER_LINE_HEIGHT = INTER_ASCENT + INTER_DESCENT;

/**
 * Styles that crop an element's box to cap-height..baseline — the CSS
 * equivalent of Figma's `text-box-trim: trim-both; text-box-edge: cap
 * alphabetic`. Spread onto any text element the card positions by its
 * optical edges.
 *
 * `lineHeight` defaults to Inter's natural `normal`; pass an explicit value
 * for a text block the design sets tighter (the BTL wordmark's two lines sit
 * 21.8px apart at 19.984px, i.e. ~1.091) — the trim compensates for the
 * changed half-leading automatically.
 *
 * Only correct on a BLOCK-level box (margins on an inline box do not affect
 * line layout), so apply it to a `div`/`p`, or to a `span` that also sets
 * `display: block`.
 */
export function capTrim(lineHeight: number = INTER_LINE_HEIGHT): CSSProperties {
  const halfLeading = (lineHeight - (INTER_ASCENT + INTER_DESCENT)) / 2;
  const trim = halfLeading + (INTER_ASCENT - INTER_CAP_HEIGHT);
  return {
    lineHeight,
    marginTop: `${-trim}em`,
    marginBottom: `${-trim}em`,
  };
}
