import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';

import {
  LineupCardCarousel,
  LineupCardView,
  LINEUP_CARD_VARIANTS,
  LINEUP_CARD_VIEW_SCALE_VAR,
  cardPitchSlots,
  type LineupCardViewData,
} from './lineup-card-carousel';
import { LINEUP_CARD_FRAME_SIZE } from './lineup-card';
import type { LineupSlot, LineupSlotPlayer } from './lineup-pitch';
import { getFormationTemplate } from '#/football/data/formations';
import { captureElementToPng } from '#/utils/export';

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
 * The XI on a 4-3-3, in ORDINARY lineup coordinates — keeper at low `x`.
 * The carousel mirrors them itself; nothing here pre-mirrors.
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

/**
 * The pitch body is mirrored for the card, and the caller does not do it.
 *
 * The card draws its pitch keeper-at-the-TOP; `LineupPitch`'s `portrait`
 * orientation is defined the other way up. Owning the mirror here is what
 * stops every caller having to know that — and stops two callers disagreeing.
 */
export const VerifyPitchIsMirroredForTheCard: Story = {
  args: { data: DATA },
  play: async () => {
    const mirrored = cardPitchSlots([
      { x: 6, y: 50, player: { id: 'a', name: 'Keeper' } },
      { x: 80, y: 50, player: { id: 'c', name: 'Striker' } },
    ]);
    await expect(mirrored[0]!.x).toBe(94);
    await expect(mirrored[1]!.x).toBe(20);
    // `y` and the player ride through untouched.
    await expect(mirrored[0]!.y).toBe(50);
    await expect(mirrored[1]!.player?.name).toBe('Striker');
  },
};
