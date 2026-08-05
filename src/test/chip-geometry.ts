import { expect } from 'storybook/test';

/**
 * Measuring a rendered lineup pitch's name chips, shared by every story file
 * that has to hold one to the geometry contract.
 *
 * These lived inside `lineup-card.stories.tsx` until 0.14.0, which meant only
 * the compositions THAT file renders were ever measured. The card is drawn by
 * a different component on the shipped path (`LineupCardView`), and it went
 * unmeasured for two releases — long enough to publish a card with three
 * clipped surnames while the suite stayed green. A second, hand-copied set of
 * assertions in the other story file would have reintroduced the same drift
 * one level down, so there is one copy and both files call it.
 */

/**
 * Wait for the state a captured card is actually rasterised in: webfonts
 * resolved, and React's font-swap re-render flushed to the DOM.
 *
 * Name chips size themselves to the REAL measured width of their label
 * (`lib/text-width.ts`), so before Inter arrives they legitimately describe
 * the fallback face the SVG is drawing at that moment, and re-measure when the
 * face swaps. Measuring the card mid-swap would assert against a transient
 * neither the viewer nor the exporter ever sees.
 */
export async function settled(): Promise<void> {
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

/** The card's pitch SVG — the widest one, so the BTL lockup's mark can't win. */
export function pitchSvg(root: HTMLElement): SVGSVGElement {
  return Array.from(root.querySelectorAll('svg')).reduce((a, b) =>
    a.getBoundingClientRect().width >= b.getBoundingClientRect().width ? a : b
  );
}

/**
 * The pitch's name-chip `<text>` nodes — the ones backed by a chip `<rect>`,
 * which is what separates them from shirt numbers and empty-slot role labels.
 */
export function chipTexts(svg: SVGSVGElement): SVGTextElement[] {
  return Array.from(svg.querySelectorAll('text')).filter(
    (text) => text.parentElement?.querySelector('rect') != null
  );
}

/** One measured name chip: its label, its backing rect, and its glyph run. */
export interface MeasuredChip {
  label: string;
  rect: DOMRect;
  text: DOMRect;
}

/** Every name chip's backing rect, paired with the label it has to contain. */
export function nameChips(svg: SVGSVGElement): MeasuredChip[] {
  return chipTexts(svg).map((text) => ({
    label: text.textContent ?? '',
    rect: text.parentElement!.querySelector('rect')!.getBoundingClientRect(),
    text: text.getBoundingClientRect(),
  }));
}

/** Overlap of two rects, in px per axis. Both positive means they intersect. */
export function intersection(a: DOMRect, b: DOMRect): { x: number; y: number } {
  return {
    x: Math.min(a.right, b.right) - Math.max(a.left, b.left),
    y: Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
  };
}

/**
 * The DRAWN pitch — the grass rect, whose edges ARE the touchlines and goal
 * lines. Deliberately not the SVG's own box: inside the card those happen to
 * coincide (`pitchPadding` is 0), but on every other surface the SVG carries a
 * gutter around the drawing, and "inside the pitch" has to mean inside the
 * thing a reader can see, on all of them.
 */
export function pitchBounds(svg: SVGSVGElement): DOMRect {
  return svg.querySelector('rect')!.getBoundingClientRect();
}

/**
 * The geometry contract the card's pitch body owes EVERY XI, asserted against
 * whichever one the calling story renders.
 *
 * Extracted so the realistic fixture and the Figma's own sample are held to
 * one identical standard. 0.11.0's assertions lived inline in a single story
 * bound to a single sample XI, which is precisely how a guard ends up
 * measuring only the case that cannot fail.
 *
 * The three clauses are not independent, and none of them can be dropped:
 *
 *  - **(1) No two chips intersect** is the reported defect stated directly.
 *    Alone, it is satisfiable by shrinking chips until their text spills out.
 *  - **(2) Every chip contains its own text** closes that, pinning the chip to
 *    its label from the other side.
 *  - **(3) No chip leaves the drawn pitch.** Alone, (1) and (2) are both
 *    satisfied by a chip hanging off the touchline into the card's margin —
 *    which is exactly what "Alexander-Arnold" did on the reported card.
 *
 * Note what this does NOT say: that every label is printed in full. All three
 * clauses are satisfied by a board of ellipses, which is how the card shipped
 * with "van D…" over a green suite. {@link expectNoTruncation} is the separate
 * claim, and the two are deliberately not merged — a lineup CAN be handed a
 * name no honest layout fits, and that case must still pass this.
 */
export function assertChipGeometry(svg: SVGSVGElement, chips: MeasuredChip[]): void {
  // (1) NO TWO NAME CHIPS INTERSECT. The defect, as a measurement.
  for (let i = 0; i < chips.length; i++) {
    for (let j = i + 1; j < chips.length; j++) {
      const a = chips[i]!;
      const b = chips[j]!;
      const { x, y } = intersection(a.rect, b.rect);
      expect(
        x > 0 && y > 0,
        `name chips "${a.label}" and "${b.label}" must not overlap — they intersect by ${x.toFixed(1)}x${y.toFixed(1)}px`
      ).toBe(false);
    }
  }

  // (2) Every chip still CONTAINS its own label. Without this, (1) could be
  // passed by shrinking chips until the text spills out of them.
  for (const { label, rect, text } of chips) {
    expect(
      text.left >= rect.left && text.right <= rect.right,
      `name chip for "${label}" must contain its text — chip [${rect.left.toFixed(1)}, ${rect.right.toFixed(1)}], text [${text.left.toFixed(1)}, ${text.right.toFixed(1)}]`
    ).toBe(true);
  }

  // (3) NOTHING LEAVES THE PITCH. Stated on all four edges rather than just
  // the two the reported card happened to break, so a formation that pushes a
  // chip off the goal line is caught by the same assertion.
  //
  // The 0.5px tolerance is anti-aliasing on the grass rect's own edge, not
  // slack in the claim — the failure this guards against was 30px+.
  const pitch = pitchBounds(svg);
  const EDGE_TOLERANCE = 0.5;
  for (const { label, rect } of chips) {
    expect(
      rect.left,
      `name chip for "${label}" must not run off the LEFT touchline — chip left ${rect.left.toFixed(1)}, pitch left ${pitch.left.toFixed(1)}`
    ).toBeGreaterThanOrEqual(pitch.left - EDGE_TOLERANCE);
    expect(
      rect.right,
      `name chip for "${label}" must not run off the RIGHT touchline — chip right ${rect.right.toFixed(1)}, pitch right ${pitch.right.toFixed(1)}`
    ).toBeLessThanOrEqual(pitch.right + EDGE_TOLERANCE);
    expect(
      rect.top,
      `name chip for "${label}" must not run off the TOP goal line — chip top ${rect.top.toFixed(1)}, pitch top ${pitch.top.toFixed(1)}`
    ).toBeGreaterThanOrEqual(pitch.top - EDGE_TOLERANCE);
    expect(
      rect.bottom,
      `name chip for "${label}" must not run off the BOTTOM goal line — chip bottom ${rect.bottom.toFixed(1)}, pitch bottom ${pitch.bottom.toFixed(1)}`
    ).toBeLessThanOrEqual(pitch.bottom + EDGE_TOLERANCE);
  }
}

/**
 * Every one of `expected` is printed IN FULL — the claim the chip-geometry
 * contract above cannot make.
 *
 * Truncation is a legitimate last resort for a name no honest layout fits, so
 * it is not banned outright anywhere; it is banned on a NAMED list of ordinary
 * surnames, which is the only form of the claim that survives a fixture edit.
 * Listing the labels rather than counting them is deliberate: a future change
 * that shortened the fixture until nothing clipped would otherwise pass while
 * measuring nothing, which is how the card shipped clipped in the first place.
 */
export function expectNoTruncation(chips: MeasuredChip[], expected: readonly string[]): void {
  const labels = chips.map((chip) => chip.label);
  for (const want of expected) {
    expect(
      labels,
      `"${want}" is an ordinary top-flight surname and must be printed in full — the board reads: ${labels.join(', ')}`
    ).toContain(want);
  }
}
