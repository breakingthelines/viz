import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';

import {
  LineupCardCarousel,
  LineupCardView,
  LINEUP_CARD_VARIANTS,
  LINEUP_CARD_VIEW_SCALE_VAR,
  type LineupCardVariant,
  type LineupCardViewData,
} from './lineup-card-carousel';
import { LINEUP_CARD_FRAME_SIZE } from './lineup-card';
import type { LineupSlot, LineupSlotPlayer } from './lineup-pitch';
import { getFormationTemplate } from '#/football/data/formations';
import { captureElementToPng } from '#/utils/export';
import {
  assertChipGeometry,
  expectNoTruncation,
  nameChips,
  pitchSvg,
  settled,
} from '#/test/chip-geometry';
import { LIVERPOOL_CHIP_LABELS, LIVERPOOL_XI, liverpoolSlots } from '#/test/fixtures/lineup-xi';

/**
 * Every view of one lineup card, swipeable, with pills.
 *
 * The gallery is a PRESENTATION component: it renders the same data four ways
 * and reports which view is showing. It knows nothing about uploading a
 * photograph, capturing a PNG or downloading one — the editor's export modal
 * supplies all of that through `children`, and a read-only reader surface
 * supplies none of it.
 *
 * The stories below double as this component's test suite: viz's vitest
 * project is wired to the Storybook test plugin (`vite.config.ts`), so every
 * `play` function here RUNS in headless Chromium in CI.
 */
const meta = {
  title: 'Football/Compositions/LineupCardCarousel',
  component: LineupCardCarousel,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof LineupCardCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

const XI: LineupSlotPlayer[] = [
  { id: 'pickford', name: 'Jordan Pickford', shirtNumber: 1 },
  { id: 'james', name: 'Reece James', shirtNumber: 24, isCaptain: true },
  { id: 'stones', name: 'John Stones', shirtNumber: 2 },
  { id: 'colwill', name: 'Levi Colwill', shirtNumber: 6 },
  { id: 'oreilly', name: 'Rico Lewis', shirtNumber: 3 },
  { id: 'rice', name: 'Declan Rice', shirtNumber: 4 },
  { id: 'wharton', name: 'Adam Wharton', shirtNumber: 14 },
  { id: 'palmer', name: 'Cole Palmer', shirtNumber: 7 },
  { id: 'bellingham', name: 'Jude Bellingham', shirtNumber: 10 },
  { id: 'kane', name: 'Harry Kane', shirtNumber: 9 },
  { id: 'saka', name: 'Bukayo Saka', shirtNumber: 18 },
];

/**
 * The XI on a 4-3-3, in ORDINARY lineup coordinates — keeper at low `x`, `y=0`
 * at the team's own left touchline. Nothing here is reshaped for the card's
 * keeper-at-the-top viewpoint; that is `LineupCardPitch`'s `portrait-down`
 * orientation, and a caller doing it by hand is the defect 0.14.0 fixed.
 */
function slots(): LineupSlot[] {
  return getFormationTemplate('4-3-3').map((t, i) => ({
    x: t.x,
    y: t.y,
    role: t.role,
    player: XI[i],
  }));
}

const DATA: LineupCardViewData = {
  title: 'Alternative England XI',
  formation: '4-3-3',
  players: XI,
  slots: slots(),
  markerContent: 'number',
};

/** The gallery as a reader would meet it: no controls, nothing to author. */
export const ReadOnly: Story = {
  args: { data: DATA },
};

/**
 * The same gallery with a host's own controls hung underneath, which is how
 * the editor's export modal uses it. Everything in `children` is rendered
 * OUTSIDE every view, so none of it can reach a capture of a card.
 */
export const WithHostControls: Story = {
  args: {
    data: DATA,
    children: (
      <button
        type="button"
        className="h-11 w-full rounded-[8px] bg-red-100 text-[13px] font-semibold text-white"
      >
        Download
      </button>
    ),
  },
};

/** A photo-less card. Legitimate and finished — nothing here says otherwise. */
export const NoPhotograph: Story = {
  args: { data: { ...DATA, heroImageUrl: undefined } },
};

// ── Verification ─────────────────────────────────────────────────────────────

/**
 * Everything a server renders, and everything a crawler reads, is here BEFORE
 * any script runs.
 *
 * The reason this matters: platform is server-rendered, and a gallery that
 * mounts its views on hydration is invisible to a crawler and blank on a slow
 * connection. So no view is lazy, no view is `display: none`, and every XI's
 * names are in the markup from the first paint.
 */
export const VerifyAllViewsInTheMarkup: Story = {
  args: { data: DATA },
  play: async ({ canvasElement }) => {
    const views = canvasElement.querySelectorAll('[data-slot="lineup-card-view"]');
    await expect(views).toHaveLength(LINEUP_CARD_VARIANTS.length);

    for (const view of views) {
      const style = getComputedStyle(view as HTMLElement);
      await expect(style.display).not.toBe('none');
      await expect(style.visibility).not.toBe('hidden');
      // Not merely mounted — laid out with real area, so it is genuinely
      // painted rather than collapsed behind a zero-size box.
      await expect((view as HTMLElement).offsetWidth).toBeGreaterThan(0);
      await expect((view as HTMLElement).offsetHeight).toBeGreaterThan(0);
    }

    // The content itself, not just the containers: names from the XI must be
    // readable inside EVERY view, including the three that are not selected.
    // (The team sheet prints surnames, so that is what is asserted — first and
    // last of the XI, so a view that rendered only part of the squad fails.)
    for (const view of views) {
      await expect(view.textContent).toContain('Pickford');
      await expect(view.textContent).toContain('Saka');
    }
  },
};

/**
 * The pills work with scripting off.
 *
 * They are anchors to the views' own ids, so a browser with no JavaScript
 * still moves the track when one is followed. This asserts the contract that
 * makes that true — a real `href` pointing at a real element — rather than
 * trying to disable scripting inside a test runner.
 */
export const VerifyPillsAreRealLinks: Story = {
  args: { data: DATA },
  play: async ({ canvasElement }) => {
    const pills = canvasElement.querySelectorAll<HTMLAnchorElement>(
      '[data-slot="lineup-card-pill"]'
    );
    await expect(pills).toHaveLength(LINEUP_CARD_VARIANTS.length);

    for (const pill of pills) {
      const href = pill.getAttribute('href');
      await expect(href, 'every pill must be a same-document fragment link').toMatch(/^#.+/);
      // And the fragment must resolve to a view that actually exists — a dead
      // anchor would look identical with JavaScript on, because the click
      // handler never lets the browser follow it.
      const target = canvasElement.ownerDocument.getElementById(href!.slice(1));
      await expect(target, `${href} must point at a mounted view`).not.toBeNull();
      await expect(target!.dataset.slot).toBe('lineup-card-view');
    }
  },
};

/**
 * A keyboard reaches every pill, and reaches the track itself.
 *
 * The track is tabbable on purpose: a carousel that can only be moved by
 * swiping puts its content behind a gesture, which is the main reason not to
 * ship one to readers.
 */
export const VerifyKeyboardReachable: Story = {
  args: { data: DATA },
  play: async ({ canvasElement }) => {
    const track = canvasElement.querySelector<HTMLElement>('[data-slot="lineup-card-track"]')!;
    await expect(track.tabIndex).toBe(0);

    const pills = [
      ...canvasElement.querySelectorAll<HTMLAnchorElement>('[data-slot="lineup-card-pill"]'),
    ];

    // Tab from the track and land on each pill in turn. Anchors with an href
    // are natively tabbable, which is the property being checked — every view
    // is selectable without a pointer.
    track.focus();
    await expect(document.activeElement).toBe(track);
    for (const pill of pills) {
      await userEvent.tab();
      await expect(document.activeElement).toBe(pill);
    }

    // And activating one by KEYBOARD selects it, not just by pointer.
    //
    // Space is asserted rather than Enter deliberately. Enter on a focused
    // anchor is the BROWSER's own activation — it arrives as a synthetic
    // click, and this runner's `userEvent.keyboard` does not perform default
    // actions, so asserting it here would test the harness rather than the
    // component. Space is the case the platform does NOT hand us (a link
    // ignores it), so it is the one the component has to implement — and the
    // one worth a test. Enter's guarantee is the resolvable `href` asserted
    // in `VerifyPillsAreRealLinks`.
    pills[2]!.focus();
    await expect(document.activeElement).toBe(pills[2]);
    pills[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await waitFor(async () => {
      await expect(pills[2]!.getAttribute('aria-current')).toBe('true');
    });
  },
};

/**
 * Selecting a pill marks exactly one view active, and marks the right one.
 */
export const VerifyPillSelectsItsView: Story = {
  args: { data: DATA },
  play: async ({ canvasElement }) => {
    const pill = canvasElement.querySelector<HTMLAnchorElement>(
      '[data-slot="lineup-card-pill"][data-variant="square-pitch"]'
    )!;
    await userEvent.click(pill);

    const active = canvasElement.querySelectorAll('[data-slot="lineup-card-view"][data-active]');
    await expect(active).toHaveLength(1);
    await expect((active[0] as HTMLElement).dataset.variant).toBe('square-pitch');
    await expect(pill.getAttribute('aria-current')).toBe('true');
  },
};

/**
 * The gallery's views are SCALED, and therefore must never be captured.
 *
 * This is the trap the whole export path is built around: `html-to-image`
 * clones a node that is already laid out, so rasterising one of these would
 * put a small layout onto a large canvas. The story asserts the two halves of
 * the contract — the gallery's own card is transformed and measures smaller
 * than the frame, while a bare `LineupCardView` rendered on its own is
 * transform-free and measures EXACTLY the frame, which is what a host must
 * capture.
 */
export const VerifyGalleryViewsAreNotCaptureTargets: Story = {
  args: { data: DATA, viewScale: 0.3 },
  play: async ({ canvasElement }) => {
    const view = canvasElement.querySelector<HTMLElement>('[data-slot="lineup-card-view"]')!;
    const card = view.querySelector<HTMLElement>('[data-slot="lineup-card"]')!;
    const scaler = card.parentElement!;

    // The card's own LAYOUT is still true size — that is what keeps the
    // preview an honest picture of the export.
    await expect(card.offsetWidth).toBe(LINEUP_CARD_FRAME_SIZE.portrait.width);
    // But it is painted through a transform, so what is on screen is small.
    await expect(getComputedStyle(scaler).transform).not.toBe('none');
    await expect(card.getBoundingClientRect().width).toBeLessThan(
      LINEUP_CARD_FRAME_SIZE.portrait.width
    );
    // Which is exactly why nothing here is the capture target: the rendered
    // box and the layout box disagree.
    await expect(Math.round(card.getBoundingClientRect().width)).not.toBe(card.offsetWidth);

    // The `viewScale` prop landed: 1200 * 0.3 = 360.
    await expect(Math.round(view.getBoundingClientRect().height)).toBe(360);

    // And it is only a FALLBACK, so a host can override it responsively from
    // its own stylesheet with no resize listener. This is the regression guard
    // for a real bug: the root used to carry the custom property as an inline
    // style, which put it on an ancestor of every view and beat any host rule
    // outright — the prop worked, the documented override silently did not.
    const root = canvasElement.querySelector<HTMLElement>('[data-slot="lineup-card-carousel"]')!;
    await expect(
      root.style.getPropertyValue(LINEUP_CARD_VIEW_SCALE_VAR),
      'the scale must not be pinned on the root, or a host can never override it'
    ).toBe('');

    root.style.setProperty(LINEUP_CARD_VIEW_SCALE_VAR, '0.5');
    await expect(Math.round(view.getBoundingClientRect().height)).toBe(600);
  },
};

/**
 * `LineupCardView` on its own — the thing a host DOES capture — is exactly
 * the frame size and rasterises to exactly the frame size, for every variant.
 */
export const VerifyStandaloneViewCapturesAtFrameSize: Story = {
  args: { data: DATA },
  render: () => (
    <div style={{ position: 'fixed', top: 0, left: -20000, width: 'max-content' }}>
      {LINEUP_CARD_VARIANTS.map((variant) => (
        <div
          key={variant.id}
          data-testid={`capture-${variant.id}`}
          style={{ width: 'max-content' }}
        >
          <LineupCardView variant={variant} data={DATA} />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const variant of LINEUP_CARD_VARIANTS) {
      const { width, height } = LINEUP_CARD_FRAME_SIZE[variant.frame];
      const target = canvasElement.querySelector<HTMLElement>(
        `[data-testid="capture-${variant.id}"]`
      )!;
      const card = target.querySelector<HTMLElement>('[data-slot="lineup-card"]')!;

      await expect(card.offsetWidth, `${variant.id} width`).toBe(width);
      await expect(card.offsetHeight, `${variant.id} height`).toBe(height);
      // No transform anywhere above it, so the painted box and the layout box
      // agree — the precondition `captureElementToPng` relies on.
      await expect(Math.round(card.getBoundingClientRect().width)).toBe(width);

      const png = await captureElementToPng(target, {
        width,
        height,
        scale: 1,
        backgroundColor: '#151515',
      });
      const decoded = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error(`${variant.id} PNG did not decode`));
        img.src = png;
      });
      await expect(decoded, `${variant.id} exported PNG`).toEqual({ width, height });
    }
  },
};

// ── The shipped card, measured ───────────────────────────────────────────────
//
// Everything below renders `LineupCardView` — the transform-free component a
// host actually captures — rather than a story-local composition of the same
// parts. That distinction is the reason these stories exist: until 0.14.0 the
// card's pitch was configured in TWO places, and every geometry guard in the
// suite measured the other one. The name type was retuned to 16px in 0.13.0
// on a pitch no reader has ever seen, while the shipped view kept rendering
// it at 25px and clipping surnames.

/** The Liverpool XI the owner reported, on the card's own pitch body. */
const REPORTED_DATA: LineupCardViewData = {
  title: 'Liverpool XI',
  formation: '4-3-3',
  players: [...LIVERPOOL_XI],
  slots: liverpoolSlots(),
  markerContent: 'number',
};

const PITCH_VARIANT: LineupCardVariant = LINEUP_CARD_VARIANTS.find(
  (variant) => variant.id === 'square-pitch'
)!;

/**
 * One `LineupCardView` at its TRUE size, parked offscreen — the capture
 * target, with no transform anywhere above it, so every px this story reads
 * is a px a reader gets.
 */
function renderCaptureTarget(data: LineupCardViewData) {
  return (
    <div style={{ position: 'fixed', top: 0, left: -20000, width: 'max-content' }}>
      <div data-testid="capture-target" style={{ width: 'max-content' }}>
        <LineupCardView variant={PITCH_VARIANT} data={data} />
      </div>
    </div>
  );
}

/** The pitch inside the offscreen capture target. */
function capturedPitch(canvasElement: HTMLElement): SVGSVGElement {
  return pitchSvg(canvasElement.querySelector<HTMLElement>('[data-testid="capture-target"]')!);
}

/** A marker's centre in real screen px, found by the player it carries. */
function markerCentre(svg: SVGSVGElement, name: string): { x: number; y: number } {
  const marker = svg.querySelector<SVGGElement>(`[aria-label="${name}"]`);
  expect(marker, `${name}'s marker must be on the pitch`).not.toBeNull();
  const box = marker!.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/**
 * The card's pitch is the view from BEHIND THE GOAL THE TEAM IS ATTACKING —
 * a 180-degree rotation of the reader's portrait pitch, not a mirror of it.
 *
 * This is the defect the owner reported: "LB/LW and RB/RW are getting
 * switched wrongly, Barcola should be on the right (it's from the
 * goalkeeper's perspective)".
 *
 * ## Why one clause is not enough
 *
 * The card wants the keeper at the TOP; `LineupPitch`'s `portrait` puts him
 * at the bottom. Turning a pitch around to look at it from the other end is a
 * ROTATION, which reverses BOTH axes. Reversing only the depth axis is a
 * MIRROR, and a mirror puts the keeper at the top too — so a test that only
 * checked the keeper's position passes on the broken render, which is exactly
 * what shipped.
 *
 * There are four ways to lay a portrait pitch out, and each is pinned by a
 * different pair of answers:
 *
 * | render                    | keeper | team's left |
 * | ------------------------- | ------ | ----------- |
 * | `portrait` (reader)       | bottom | viewer left |
 * | `portrait`, y reversed    | bottom | viewer right|
 * | `portrait`, x reversed    | top    | viewer left | ← what shipped
 * | 180-degree rotation       | top    | viewer right| ← the card
 *
 * Both clauses below are therefore load-bearing, and together they identify
 * the card's viewpoint uniquely.
 *
 * ## Measured, not derived
 *
 * Every assertion reads `getBoundingClientRect()` off the rendered markers.
 * Nothing here inspects a coordinate transform, so a future change that keeps
 * the transform and breaks the render — or replaces the transform entirely,
 * as 0.14.0 does — is judged on what a reader sees.
 */
export const VerifyPitchIsTheKeepersViewpoint: Story = {
  args: { data: REPORTED_DATA },
  render: () => renderCaptureTarget(REPORTED_DATA),
  play: async ({ canvasElement }) => {
    await settled();
    const svg = capturedPitch(canvasElement);

    // (1) THE KEEPER IS AT THE TOP, and the front three at the bottom — the
    // half of the contract the previous build did satisfy.
    const keeper = markerCentre(svg, 'Alisson Becker');
    for (const forward of ['Barcola', 'Isak', 'Mbaye']) {
      expect(
        keeper.y,
        `the card draws the keeper at the TOP — Alisson must sit above ${forward}`
      ).toBeLessThan(markerCentre(svg, forward).y);
    }

    // (2) THE TEAM'S LEFT IS THE VIEWER'S RIGHT — the half it did not.
    //
    // Stated first as the owner stated it, so a failure reads like the report.
    expect(
      markerCentre(svg, 'Barcola').x,
      'Barcola plays on the LEFT wing, and the card looks up the pitch from behind the goal, so he must render to the viewer’s RIGHT of the right winger'
    ).toBeGreaterThan(markerCentre(svg, 'Mbaye').x);
    expect(
      markerCentre(svg, 'Kerkez').x,
      'Kerkez is the LEFT back and must render to the viewer’s RIGHT of Frimpong, the right back'
    ).toBeGreaterThan(markerCentre(svg, 'Frimpong').x);

    // (3) And it holds for the WHOLE XI, not the two pairs named above — a
    // partial fix that reversed the wingers and left the back four alone
    // would satisfy (2) on its own.
    //
    // `y` in lineup coordinates runs 0 (the team's own left touchline) to 100
    // (its right). Under a 180-degree rotation that ordering reverses on
    // screen exactly, so for every pair of players the one with the SMALLER
    // `y` must render at the LARGER screen x.
    const placed = liverpoolSlots()
      .filter((slot) => slot.player)
      .map((slot) => ({
        name: slot.player!.name,
        y: slot.y,
        x: markerCentre(svg, slot.player!.name).x,
      }));
    expect(placed, 'the whole XI is on the pitch').toHaveLength(11);

    for (const a of placed) {
      for (const b of placed) {
        if (a.y >= b.y) continue;
        expect(
          a.x,
          `${a.name} (y ${a.y}, further LEFT than ${b.name} at y ${b.y}) must render further RIGHT on screen — got ${a.x.toFixed(1)}px against ${b.x.toFixed(1)}px`
        ).toBeGreaterThan(b.x);
      }
    }
  },
};

/**
 * Ordinary top-flight surnames are printed in full on the shipped card.
 *
 * The second half of the owner's report: "van D…", "Jacq…", "Frim…" — van
 * Dijk, a second centre back and Frimpong, all clipped across the back four,
 * where markers sit closest together and a chip's share of its row is
 * smallest.
 *
 * `LONG_NAME_XI` was added in 0.13.0 to stop exactly this and did not, for two
 * reasons that this story fixes separately:
 *
 *  - it stressed the EXTREME ("Alexander-Arnold", "Papastathopoulos") when the
 *    names that broke were unremarkable six-to-eight-character surnames, and
 *  - it was only ever rendered through the card stories' own pitch, not
 *    through `LineupCardView`, which is what a reader is handed.
 *
 * So this measures the shipped component against the lineup that broke. The
 * geometry contract is asserted too, not just the absence of ellipses — a
 * layout that stopped truncating by letting chips collide would be a
 * different defect, not a fix.
 */
export const VerifyOrdinarySurnamesArePrintedInFull: Story = {
  args: { data: REPORTED_DATA },
  render: () => renderCaptureTarget(REPORTED_DATA),
  play: async ({ canvasElement }) => {
    await settled();
    const svg = capturedPitch(canvasElement);

    const chips = nameChips(svg);
    expect(chips, 'one name chip per player').toHaveLength(11);

    // Nothing clipped — named surname by surname, so a fixture edit that
    // quietly shortened one fails here rather than silently measuring less.
    expectNoTruncation(chips, LIVERPOOL_CHIP_LABELS);

    // And the fit contract still holds: no chip overlaps another, every chip
    // contains its own text, nothing leaves the pitch.
    assertChipGeometry(svg, chips);
  },
};
