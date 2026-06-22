/**
 * Console spy for SVG-attribute regression tests.
 *
 * React logs a runtime `console.error` when an SVG geometry attribute receives a
 * non-finite value — e.g. `Error: <circle> attribute r: Expected length,
 * "undefined".`. These never throw, so a story can pass while quietly emitting
 * the warning on every render. The blocks plot data-derived geometry through
 * framer-motion, where an animated `r`/`cx`/`cy` read mid-transition (an
 * entering/exiting node, a freshly-swapped filtered set) is the classic source.
 *
 * {@link trackSvgAttributeErrors} wraps `console.error` for the duration of a
 * `play` test and collects any message that names an SVG attribute, so a test
 * can assert the list is empty. It deliberately matches only the SVG-attribute
 * family (not all console errors) so unrelated noise never fails the lock.
 */

/** A captured console.error call, flattened to a single string for matching. */
function flatten(args: unknown[]): string {
  return args
    .map((a) => {
      if (a instanceof Error) return `${a.message}`;
      if (typeof a === 'string') return a;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

/**
 * `<circle> attribute r: Expected length, "undefined"` and its `cx`/`cy`/`x`/`y`/
 * width/height siblings, however React/JSDOM/Chromium happen to phrase it.
 */
const SVG_ATTR_RE =
  /attribute (r|cx|cy|x|y|x1|y1|x2|y2|width|height|d)\b[^]*?(Expected|NaN|undefined|infinit)/i;

export interface SvgAttributeErrorTracker {
  /** All captured console.error messages that look like an SVG-attribute error. */
  svgAttribute(): string[];
  /** Every captured console.error message (for debugging a failing lock). */
  all(): string[];
  /** Restore the original `console.error`. Always call in a `finally`. */
  restore(): void;
}

/**
 * A circle found mid-transition whose `r` attribute is missing / non-finite /
 * non-positive — the rendered symptom of an animated `r` resolving to
 * `undefined`/`NaN` for a frame. `r` is the raw attribute string (or `null`).
 */
export interface BadCircleSample {
  r: string | null;
  cx: string | null;
  cy: string | null;
}

/**
 * Scan a subtree for `<circle>` elements whose `r` attribute is absent or not a
 * finite positive number. React DROPS an attribute set to `undefined`/`NaN`
 * (rendering `r=null`) and, in a dev build, logs `<circle> attribute r: Expected
 * length, "undefined"`. The vitest browser build runs React WITHOUT dev warnings
 * — that console error never fires here — so this DOM check is the reliable
 * signal: if any animated circle's `r` ever resolves to undefined for a frame,
 * the attribute is missing and this catches it. Sample it repeatedly across a
 * transition to catch the transient frame.
 */
export function findBadCircles(root: ParentNode): BadCircleSample[] {
  const bad: BadCircleSample[] = [];
  for (const c of root.querySelectorAll('circle')) {
    const r = c.getAttribute('r');
    const n = r === null ? Number.NaN : Number.parseFloat(r);
    if (!(Number.isFinite(n) && n > 0)) {
      bad.push({ r, cx: c.getAttribute('cx'), cy: c.getAttribute('cy') });
    }
  }
  return bad;
}

/**
 * Poll {@link findBadCircles} every animation frame for `durationMs`, returning
 * every distinct bad-circle signature seen across the window — so a circle whose
 * `r` is undefined for only one mid-transition frame is still caught. Run an
 * interaction (a selector swap) concurrently with this poll.
 */
export async function collectBadCirclesDuring(
  root: ParentNode,
  interaction: () => Promise<void>,
  durationMs = 1200
): Promise<BadCircleSample[]> {
  const seen = new Map<string, BadCircleSample>();
  let polling = true;
  const poll = () => {
    if (!polling) return;
    for (const b of findBadCircles(root)) seen.set(`${b.r}|${b.cx}|${b.cy}`, b);
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
  const deadline = new Promise<void>((res) => setTimeout(res, durationMs));
  await interaction();
  await deadline;
  polling = false;
  return [...seen.values()];
}

/**
 * Watch the `r` attribute of every `<circle>` matching `selector` on each
 * animation frame for `durationMs`, returning the set of distinct values seen.
 *
 * This is the prod-build-safe lock for the animated-`r` defect (viz #27, item 7).
 * The vitest browser build runs React WITHOUT dev warnings, so the
 * `<circle> attribute r: Expected length, "undefined"` console error never fires
 * here — but the underlying mistake (`animate={{ r: [...] }}` on a `motion.circle`)
 * is still observable: framer-motion would drive the `r` ATTRIBUTE through its
 * keyframes, so `r` would take many distinct values over the animation. The
 * correct implementation animates `scale` (a transform) and leaves `r` fixed, so
 * exactly one distinct value is observed. A test asserts the set has size ≤ 1.
 */
export async function observeCircleRadii(
  root: ParentNode,
  selector: string,
  durationMs: number
): Promise<string[]> {
  const seen = new Set<string>();
  let polling = true;
  const sample = () => {
    if (!polling) return;
    for (const el of root.querySelectorAll(selector)) {
      const r = el.getAttribute('r');
      if (r != null) seen.add(r);
    }
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
  await new Promise<void>((res) => setTimeout(res, durationMs));
  polling = false;
  return [...seen];
}

/**
 * Begin spying on `console.error`. The original is still called (so real errors
 * stay visible in the test output); messages are also recorded for assertions.
 */
export function trackSvgAttributeErrors(): SvgAttributeErrorTracker {
  const original = console.error;
  const captured: string[] = [];
  console.error = (...args: unknown[]) => {
    captured.push(flatten(args));
    original.apply(console, args as Parameters<typeof console.error>);
  };
  return {
    svgAttribute: () => captured.filter((m) => SVG_ATTR_RE.test(m)),
    all: () => [...captured],
    restore: () => {
      console.error = original;
    },
  };
}
