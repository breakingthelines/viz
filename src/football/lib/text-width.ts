import { useSyncExternalStore } from 'react';
import { BLOCK_FONT_STACK } from '#/football/lib/font';

/**
 * Rendered width of a short label, measured SYNCHRONOUSLY, in `em`.
 *
 * ## Why this exists
 *
 * SVG `<text>` carries no layout box a sibling `<rect>` can be sized against
 * before paint, so anything drawing a backing plate behind SVG text has to
 * decide how wide the glyph run will be BEFORE the browser lays it out. The
 * blocks used to answer that with a single average per-character advance, and
 * on the lineup social card that estimate was the whole defect: measured
 * against Inter at the card's real size, the true advance of the sample XI's
 * surnames ranges from 0.451em/char ("Colwill") to 0.620em/char ("James") — a
 * 37% spread. One constant has to be set at the TOP of that range or short-run
 * names get clipped, which then makes every other chip up to a third wider
 * than its own text and collides neighbouring name chips that the design keeps
 * clearly apart.
 *
 * A canvas `measureText` is the same glyph run the SVG will draw, resolved
 * against the same font stack, and — the part that matters here — it is
 * FULLY SYNCHRONOUS. It needs no post-paint measure/resize pass, so the
 * blocks keep rendering correctly on their FIRST render, which the capture
 * path (`utils/export.ts`) depends on: it rasterises the SVG as it stands and
 * never gives a second layout pass a chance to run. Verified equal to the
 * browser's own `getComputedTextLength()` on the real SVG node, to 0.01 user
 * units, across the sample XI.
 *
 * ## Measured in `em`, not pixels
 *
 * Text advance scales linearly with font size, so measuring once at a
 * reference size and returning a multiplier makes the result independent of
 * the caller's units. That matters because callers here work in SVG USER
 * UNITS, not CSS pixels — a chip 0.5em wider is correct at every viewBox
 * scale, whereas a pixel measurement would be wrong at all but one.
 *
 * ## Re-measured when the webfont swaps in
 *
 * Before Inter loads, a canvas measures the FALLBACK face — and that is the
 * right answer for that moment, because under `font-display: swap` the
 * fallback is precisely what the SVG is drawing too. The chip hugs whatever
 * face is on screen right now.
 *
 * What would be wrong is KEEPING that answer. Measured in the test browser the
 * fallback ran 12.6% narrower than Inter, so a width cached from it would size
 * every chip too tight for the text it was about to receive — the one failure
 * mode a backing chip exists to prevent. {@link useFontsReady} is what closes
 * that: it re-renders the subscriber when faces finish loading, and it keys
 * this module's cache, so the swap is followed by a fresh measurement instead
 * of a stale one. Callers therefore fall back to their own estimate only where
 * there is no canvas to measure with at all (server-side rendering).
 */

/**
 * Font size the measurement is taken at. Large enough that per-glyph hinting
 * and sub-pixel rounding are a negligible fraction of the result, small enough
 * to stay well inside any engine's text-run limits.
 */
const REFERENCE_FONT_PX = 100;

/**
 * The tracking the blocks set their SVG labels with (-3%, the card's shared
 * value — see `CARD_TRACKING`). Applied to the measurement so the chip sizes
 * to the run as it is actually drawn, not to an untracked one ~3% wider. With
 * it set, canvas and SVG agree exactly; without it, canvas over-measures by
 * that 3% — loose rather than clipped, so an engine that does not support the
 * property still degrades safely.
 */
const MEASURE_LETTER_SPACING = '-0.03em';

/**
 * The exact font the measuring context is configured with, in the shorthand
 * `FontFaceSet.check` expects.
 *
 * Deliberately a check for THIS face rather than a read of
 * `document.fonts.status`. `status` is a document-wide signal: it reports
 * `'loading'` while ANY face anywhere on the page is still in flight, which on
 * a host loading several weights (or a Storybook loading four) can stay true
 * long after Inter itself is usable — measured in the test browser, canvas was
 * already returning true Inter metrics while `status` still said `'loading'`,
 * so gating on it left the chips on the fallback estimate indefinitely.
 * `check()` answers the only question that matters here: can this exact font
 * be measured right now. It also returns `true` when the host has no Inter
 * webfont at all, which is correct — there is nothing to wait for, and the
 * stack's system fallback is what will be drawn.
 */
const MEASURE_FONT = `400 ${REFERENCE_FONT_PX}px ${BLOCK_FONT_STACK}`;

/** Lazily-built measuring context. `null` once we know we cannot have one. */
let measureCtx: CanvasRenderingContext2D | null | undefined;

function context(): CanvasRenderingContext2D | null {
  if (measureCtx !== undefined) return measureCtx;
  measureCtx = null;
  if (typeof document === 'undefined') return measureCtx;
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.font = MEASURE_FONT;
      // Assign AFTER `font`: setting `font` resets letter spacing in some
      // engines, so the order here is load-bearing rather than stylistic.
      ctx.letterSpacing = MEASURE_LETTER_SPACING;
      measureCtx = ctx;
    }
  } catch {
    // Keep `null` — the caller falls back to its own estimate.
  }
  return measureCtx;
}

function fontsLoaded(): boolean {
  if (typeof document === 'undefined' || !document.fonts) return false;
  try {
    return document.fonts.check(MEASURE_FONT);
  } catch {
    // A malformed shorthand throws per spec; treat as unmeasurable.
    return false;
  }
}

function subscribeToFonts(onChange: () => void): () => void {
  if (typeof document === 'undefined' || !document.fonts) return () => {};
  let live = true;
  // `document.fonts.ready` settles once loading finishes; `loadingdone` covers
  // a LATER batch (a host swapping weights in, a lazily-imported face).
  const done = () => {
    if (live) onChange();
  };
  void document.fonts.ready.then(done);
  document.fonts.addEventListener('loadingdone', done);
  return () => {
    live = false;
    document.fonts.removeEventListener('loadingdone', done);
  };
}

/**
 * Whether webfonts have finished loading — `false` during SSR and on the first
 * client render of a page still fetching them, flipping to `true` (and
 * re-rendering the subscriber) once they land.
 *
 * Pass the result to {@link measureLabelEm}. It is a hook rather than a bare
 * read because a component that measured too early must be told to measure
 * again; nothing else would re-render it.
 */
export function useFontsReady(): boolean {
  return useSyncExternalStore(
    subscribeToFonts,
    fontsLoaded,
    // Server snapshot: never claim fonts are ready, so SSR output is built
    // from the estimate and hydration does not disagree with it.
    () => false
  );
}

const cache = new Map<string, number>();

/**
 * Width of `label` in `em` (multiples of the font size it will be drawn at),
 * for the blocks' own {@link BLOCK_FONT_STACK} at regular weight.
 *
 * `fontsReady` (from {@link useFontsReady}) does not gate measurement — it
 * keys the cache, so a width measured before the webfont swapped in is never
 * reused after it.
 *
 * Returns `null` — never throws, never guesses — when there is nothing to
 * measure with: no `document` (server-side rendering), or an environment that
 * refuses a canvas 2D context. Callers keep their own estimate for those cases
 * rather than this module inventing a worse one, since only the caller knows
 * how much slack its layout can absorb.
 *
 * Cached: a formation board re-renders on every drag frame and would otherwise
 * re-measure the same eleven surnames each time.
 */
export function measureLabelEm(label: string, fontsReady: boolean): number | null {
  if (!label) return 0;
  const ctx = context();
  if (!ctx) return null;

  // `fontsReady` is a CACHE KEY, not a gate. Measuring is always better than
  // estimating — the canvas resolves the same stack the SVG does, so before
  // the webfont lands both describe the fallback face. Keying on readiness is
  // what stops a pre-swap width outliving the face it was measured from.
  const key = `${fontsReady ? 'f' : '_'}${label}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const em = ctx.measureText(label).width / REFERENCE_FONT_PX;
  // A context that measures everything as 0 (some headless/canvas-stub
  // environments) is worse than no measurement at all — fall back instead.
  if (!Number.isFinite(em) || em <= 0) return null;

  cache.set(key, em);
  return em;
}
