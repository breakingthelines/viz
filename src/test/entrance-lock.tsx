/**
 * Entrance-blank lock for the StatsBomb blocks (viz #28).
 *
 * Root cause it guards: core block content (pass lines, the heat/control/press
 * canvas, set-piece deliveries, the xG curve, moment-360 layers …) used
 * framer-motion `initial={{ opacity: 0 }}` / `initial={{ pathLength: 0 }}` and
 * only became visible once the mount/entrance animation ran. When that animation
 * tick was dropped — a hydration/timing race, a keyed remount, the React #419
 * hydration error — the element stuck at its hidden `initial` and the whole
 * block rendered blank (the user saw it on Line-Breaking, on BOTH view modes, so
 * it was never the filter).
 *
 * The fix: core content uses `initial={false}` so it paints at its resting state
 * on the FIRST frame with no dependence on the entrance animation. These helpers
 * reproduce the "animation never plays" condition with
 * `<MotionConfig reducedMotion="always">` and assert the content is visible after
 * a single animation frame — i.e. WITHOUT waiting for any entrance to run.
 * Re-introducing an `initial={{ opacity: 0 }}` gate on core content makes the
 * first-frame opacity read ~0 and fails these assertions.
 */
import type { Decorator } from '@storybook/react-vite';
import { MotionConfig } from 'framer-motion';
import { expect } from 'storybook/test';

/** Story decorator: render with all framer-motion animations disabled. */
export const withReducedMotion: Decorator = (Story) => (
  <MotionConfig reducedMotion="always">
    <Story />
  </MotionConfig>
);

/** Wait a single animation frame, then a microtask, so first paint has settled. */
async function nextFrame(): Promise<void> {
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  await Promise.resolve();
}

/**
 * The effective opacity of `el` — the product of its own `opacity` and every
 * ancestor's up to and including `root`. A gated parent `<g>` (opacity 0) hides
 * its children even when the child's own opacity is 1, so the regression must be
 * measured cumulatively, not on the leaf alone.
 */
function effectiveOpacity(el: Element, root: Element): number {
  let acc = 1;
  let node: Element | null = el;
  while (node) {
    const o = Number.parseFloat(getComputedStyle(node).opacity || '1');
    if (Number.isFinite(o)) acc *= o;
    if (node === root) break;
    node = node.parentElement;
  }
  return acc;
}

/**
 * Assert that at least `min` SVG elements matching `selector` are visible on the
 * first frame (effective opacity ≥ `threshold`). Transparent hit-areas (stroke
 * or fill `"transparent"`) are excluded. Visibility must hold WITHOUT the
 * entrance animation having run.
 */
export async function expectSvgContentVisibleOnFirstFrame(
  canvasElement: HTMLElement,
  {
    selector,
    min = 1,
    threshold = 0.1,
    svgSelector,
  }: { selector: string; min?: number; threshold?: number; svgSelector?: string }
): Promise<void> {
  await nextFrame();
  const svg = svgSelector
    ? (canvasElement.querySelector(svgSelector) as SVGSVGElement | null)
    : richestSvg(canvasElement);
  expect(svg, 'block SVG present').not.toBeNull();
  const els = [...svg!.querySelectorAll(selector)].filter(
    (el) => el.getAttribute('stroke') !== 'transparent' && el.getAttribute('fill') !== 'transparent'
  );
  const visible = els.filter((el) => effectiveOpacity(el, svg!) >= threshold);
  expect(
    visible.length,
    `≥${min} "${selector}" visible on first frame without the entrance animation (found ${visible.length}/${els.length})`
  ).toBeGreaterThanOrEqual(min);
}

/**
 * The block's main visual SVG — the pitch or the chart. Both use a viewBox with
 * a height of 100 (pitch) or 360 (chart); a tiny dropdown/chevron glyph SVG has
 * far fewer children, so pick the SVG with the most descendants.
 */
function richestSvg(canvasElement: HTMLElement): SVGSVGElement | null {
  const candidates = [...canvasElement.querySelectorAll('svg[viewBox]')] as SVGSVGElement[];
  if (candidates.length === 0) return null;
  return candidates.reduce((best, svg) =>
    svg.querySelectorAll('*').length > best.querySelectorAll('*').length ? svg : best
  );
}

/**
 * Assert that a `<canvas>`-backed block (heat map, pitch control, press map) has
 * its canvas visible on the first frame — effective opacity ≥ `threshold` over
 * the canvas and its ancestors — WITHOUT the entrance animation having run.
 */
export async function expectCanvasVisibleOnFirstFrame(
  canvasElement: HTMLElement,
  { threshold = 0.5 }: { threshold?: number } = {}
): Promise<void> {
  await nextFrame();
  const canvas = canvasElement.querySelector('canvas');
  expect(canvas, 'block canvas present').not.toBeNull();
  const opacity = effectiveOpacity(canvas!, document.body);
  expect(
    opacity,
    `canvas visible on first frame without the entrance animation (opacity ${opacity})`
  ).toBeGreaterThanOrEqual(threshold);
}
