import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import {
  LineupCardCarousel,
  LineupCardView,
  LEADING_SLIDE_ID,
  LINEUP_CARD_VARIANTS,
  LINEUP_CARD_VIEW_SCALE_VAR,
  type LineupCardSlide,
  type LineupCardVariant,
  type LineupCardViewData,
} from './lineup-card-carousel';
import { LINEUP_CARD_FRAME_SIZE } from './lineup-card';
import { LineupPitch } from './lineup-pitch';
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

// ── The track's geometry ─────────────────────────────────────────────────────

/**
 * Narrower than a single square card view (1212 * 0.35 = 424px), so the
 * geometry stories below measure a track that genuinely scrolls. Measuring a
 * track with slack in it would pass on any padding at all.
 */
const TRACK_WIDTH = 420;

const trackOf = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<HTMLElement>('[data-slot="lineup-card-track"]')!;

const viewsOf = (canvasElement: HTMLElement) => [
  ...canvasElement.querySelectorAll<HTMLElement>('[data-slot="lineup-card-view"]'),
];

const pillsOf = (canvasElement: HTMLElement) => [
  ...canvasElement.querySelectorAll<HTMLAnchorElement>('[data-slot="lineup-card-pill"]'),
];

/**
 * Nothing before the first slide, nothing after the last.
 *
 * The defect this pins: the track used to carry `px-[50%]`, the usual
 * companion to `snap-center`, which is what lets an end slide reach the MIDDLE
 * of the viewport. Percentage padding on a scroll container is content — so at
 * rest the reader was shown half a container of empty band and then the card,
 * pushed right by an allowance made for a slide in the middle of the track.
 *
 * Both ends are asserted, because the obvious wrong fix is to move the
 * allowance rather than remove it: `pl-0 pr-[50%]` would satisfy a first-slide
 * check on its own and leave the same band hanging off the other end.
 */
async function expectFlushEnds(canvasElement: HTMLElement) {
  const track = trackOf(canvasElement);
  const views = viewsOf(canvasElement);
  const first = views[0]!;
  const last = views.at(-1)!;

  // The track really does scroll, or none of this measures anything.
  await expect(
    track.scrollWidth,
    'the track must overflow for its end geometry to mean anything'
  ).toBeGreaterThan(track.clientWidth);
  await expect(track.scrollLeft, 'the track starts at its own beginning').toBe(0);

  // (1) AT REST, the first slide starts exactly where the container does.
  await expect(
    Math.round(first.getBoundingClientRect().left - track.getBoundingClientRect().left),
    'the first slide must be flush with the container’s left edge'
  ).toBe(0);

  // (2) AT THE FAR END, the last slide finishes exactly where it does.
  track.scrollLeft = track.scrollWidth;
  await waitFor(async () => {
    await expect(
      Math.round(last.getBoundingClientRect().right - track.getBoundingClientRect().right),
      'the last slide must be flush with the container’s right edge'
    ).toBe(0);
  });
  track.scrollLeft = 0;

  // (3) And the CAUSE, not only the symptom: a later hand reaching for
  // `px-[50%]` again puts the band straight back, and (1) and (2) alone would
  // not say why they failed.
  const padded = getComputedStyle(track);
  await expect(padded.paddingLeft, 'the track pads its own content out of view').toBe('0px');
  await expect(padded.paddingRight, 'the track pads its own content out of view').toBe('0px');
}

/**
 * The ends are flush, the middle still centres.
 *
 * The second half matters as much as the first: the fix is not "stop
 * centring", it is "centre everything the track CAN centre and let the two it
 * cannot sit against the edges". `snap-start` / `snap-end` on the end slides
 * say that in CSS; `restingScrollLeft` says the same thing in arithmetic, so
 * the scroll handler and the stylesheet cannot disagree about where a slide
 * lives.
 */
export const VerifyTrackEndsAreFlush: Story = {
  args: { data: DATA },
  render: () => (
    <div style={{ width: TRACK_WIDTH }}>
      <LineupCardCarousel data={DATA} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expectFlushEnds(canvasElement);

    const views = viewsOf(canvasElement);
    const snapOf = (view: HTMLElement) => getComputedStyle(view).scrollSnapAlign;
    await expect(snapOf(views[0]!), 'the first slide snaps to the start').toContain('start');
    await expect(snapOf(views.at(-1)!), 'the last slide snaps to the end').toContain('end');
    for (const middle of views.slice(1, -1)) {
      await expect(snapOf(middle), 'every slide between them still centres').toContain('center');
    }

    // Measured, not merely declared: pick a middle slide and it lands in the
    // middle. This is the "in-between behaviour unchanged" half of the fix.
    const track = trackOf(canvasElement);
    const middleIndex = 1;
    await userEvent.click(pillsOf(canvasElement)[middleIndex]!);
    await waitFor(async () => {
      const view = views[middleIndex]!.getBoundingClientRect();
      const box = track.getBoundingClientRect();
      await expect(
        Math.abs(view.left + view.width / 2 - (box.left + box.width / 2)),
        'a slide the track can centre is still centred'
      ).toBeLessThan(2);
    });
  },
};

/**
 * At rest, the gallery reports the slide the reader is actually looking at.
 *
 * The companion defect to the band, and the reason the fix is not one line of
 * CSS. The scroll handler used to pick whichever slide sat nearest the
 * VIEWPORT'S MIDDLE, which was sound only while `px-[50%]` guaranteed every
 * slide could reach it. With the padding gone the first slide's own centre is
 * left of the viewport's middle at scroll offset 0, so on any track wide
 * enough the SECOND slide measures closer — and the gallery marks a slide
 * active while the reader is plainly looking at the one before it.
 *
 * `restingScrollLeft` clamps each slide's resting place to the scroll range,
 * which is the same rule the CSS snapping follows, so the two agree at the
 * ends as well as the middle.
 */
export const VerifyRestingAtTheStartSelectsTheFirstSlide: Story = {
  args: { data: DATA },
  render: () => (
    // Deliberately WIDE — wide enough that the second slide is nearer the
    // viewport's middle than the first is when the track is at 0, which is
    // exactly the case the old midpoint rule got wrong.
    <div style={{ width: 900 }}>
      <LineupCardCarousel data={DATA} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const track = trackOf(canvasElement);
    const views = viewsOf(canvasElement);
    const pills = pillsOf(canvasElement);

    // The band, on the width it was reported at. The wider the reader's
    // column the worse it got: `px-[50%]` with `snap-center` CENTRED the
    // first slide, so the empty run before it was half the difference between
    // the column and the card — 275px in this 900px one, against 35px in a
    // phone-width track. Desktop is where the owner saw it, so desktop is
    // where it is pinned.
    await expect(
      Math.round(views[0]!.getBoundingClientRect().left - track.getBoundingClientRect().left),
      'the first slide must start at the container’s edge, on a wide column too'
    ).toBe(0);

    // The premise: at rest, slide two really is nearer the middle of the
    // viewport than slide one. Without this the story would pass on the old
    // rule too, and prove nothing.
    const middle = track.getBoundingClientRect().left + track.clientWidth / 2;
    const centreOf = (view: HTMLElement) => {
      const box = view.getBoundingClientRect();
      return box.left + box.width / 2;
    };
    await expect(
      Math.abs(centreOf(views[1]!) - middle),
      'this track must be wide enough for the midpoint rule to pick the wrong slide'
    ).toBeLessThan(Math.abs(centreOf(views[0]!) - middle));

    // Move the track away and let it come back to the very start.
    //
    // Driven by SCROLLING it, not by picking an indicator: a pick also arms
    // the guard that holds a selection while its own scroll is in flight, and
    // this story is about the swipe half of the control. A bare nudge would
    // not do either — the track snaps mandatorily, so a few px are simply
    // undone and the handler is never asked the question.
    track.scrollLeft = track.scrollWidth;
    await waitFor(async () => {
      await expect(views.at(-1)!.dataset.active, 'the track really did travel to the far end').toBe(
        'true'
      );
    });

    track.scrollLeft = 0;
    await waitFor(
      async () => {
        // Back at the start — within a pixel, because mandatory snapping
        // settles on a sub-pixel boundary and the exact resting offset is not
        // what this story is about.
        await expect(track.scrollLeft, 'the track came back to its own start').toBeLessThan(2);
        await expect(
          views[0]!.dataset.active,
          'resting at the start is looking at the first slide'
        ).toBe('true');
        await expect(pills[0]!.getAttribute('aria-current')).toBe('true');
        await expect(views[1]!.dataset.active).toBeUndefined();
      },
      { timeout: 3000 }
    );
  },
};

// ── The indicators ───────────────────────────────────────────────────────────

/**
 * The controls are BARS, and they still have names.
 *
 * The owner's note: "we shouldnt actually have the full verbatim labels for
 * them, just have the typical carousel pills (like we have for hero carousel
 * on landing)". Four captions — "Team sheet 5:6", "Pitch 5:6", "Team sheet
 * 1:1", "Pitch 1:1" — is a row of interface explaining a row of pictures, on
 * a surface a reader came to read an article on.
 *
 * The trap in obeying that literally is deleting the accessible names with the
 * visible ones, which turns a design note into an accessibility regression: a
 * screen-reader user would be handed four identical unnamed links. So this
 * asserts BOTH halves, and they pull against each other — nothing visible, and
 * every view still individually named and addressable.
 */
export const VerifyIndicatorsAreBarsThatStillCarryNames: Story = {
  args: { data: DATA },
  render: () => (
    <div style={{ width: TRACK_WIDTH }}>
      <LineupCardCarousel data={DATA} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const pills = pillsOf(canvasElement);
    await expect(pills).toHaveLength(LINEUP_CARD_VARIANTS.length);

    for (const [index, pill] of pills.entries()) {
      const variant = LINEUP_CARD_VARIANTS[index]!;

      // (1) NOTHING IS PRINTED. Not "no label element" — no text at all,
      // anywhere inside the control.
      await expect(pill.textContent?.trim(), `${variant.id} must print nothing`).toBe('');

      // (2) It is a BAR, measured. A chip reading "Team sheet 5:6" is ~90px
      // wide; the bar is 24. Sizing rather than class names, so a restyle that
      // keeps the classes and loses the shape still fails.
      const bar = pill.firstElementChild as HTMLElement;
      await expect(bar, `${variant.id} must draw a bar`).not.toBeNull();
      await expect(Math.round(bar.getBoundingClientRect().height)).toBe(4);
      await expect(Math.round(bar.getBoundingClientRect().width)).toBe(24);
      // The bar is the mark, the anchor is the TARGET — a 24x4px hit area is
      // not a pointer target on the phone this is mostly read on.
      await expect(Math.round(pill.getBoundingClientRect().height)).toBe(24);

      // (3) THE NAME SURVIVED, and it is the spoken one — "Team sheet,
      // portrait five by six", not "Team sheet 5:6", which reads as nonsense.
      await expect(
        pill.getAttribute('aria-label'),
        `${variant.id} must still be named for a screen reader`
      ).toBe(variant.spokenLabel ?? variant.label);
    }

    // (4) And the names are DISTINCT, so the views can actually be told apart
    // — four controls all called "Lineup card view" would satisfy (3).
    const names = pills.map((pill) => pill.getAttribute('aria-label'));
    await expect(new Set(names).size, 'every view needs its own name').toBe(names.length);

    // (5) `aria-current` still tracks the selection, which is now the ONLY
    // thing that says which view is showing — there is no text left to bold.
    await expect(pills.filter((pill) => pill.getAttribute('aria-current') === 'true')).toHaveLength(
      1
    );
    await userEvent.click(pills[2]!);
    await waitFor(async () => {
      const current = pills.filter((pill) => pill.getAttribute('aria-current') === 'true');
      await expect(current, 'exactly one view is current').toHaveLength(1);
      await expect(current[0]).toBe(pills[2]);
    });
    await expect(pills[0]!.getAttribute('aria-current')).toBeNull();
  },
};

// ── The leading slide ────────────────────────────────────────────────────────

/**
 * What the editor hands in.
 *
 * The real one is the editor's `ReaderPlate` framing a `LineupPitch` — the
 * plate a reader is shown with the gallery switched off. viz cannot import it
 * (that dependency runs the wrong way; it is why the carousel takes a node
 * rather than building one), so this stands in with the two properties the
 * carousel actually depends on: it is FLUID, sizing itself to the width it is
 * given rather than to an absolute frame, and it draws its OWN border.
 */
function LeadingPlate() {
  return (
    <div
      data-testid="leading-plate"
      className="rounded-[14px] border border-white/10 bg-white/[0.03] p-3"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-100">Lineup</p>
      <p className="mb-2 text-[15px] font-semibold text-white">Alternative England XI</p>
      <LineupPitch slots={slots()} markerContent="number" showNames />
    </div>
  );
}

const LEADING_LABEL = 'The lineup as published';

/**
 * The gallery with a leading slide, reporting what it selects into the DOM so
 * a `play` function can read the callback's arguments back.
 */
function LeadingSlideHarness() {
  const [last, setLast] = useState<{ id: string; variant?: LineupCardVariant } | null>(null);
  return (
    <div style={{ width: TRACK_WIDTH }}>
      <LineupCardCarousel
        data={DATA}
        leadingSlide={{ label: LEADING_LABEL, content: <LeadingPlate /> }}
        onValueChange={(id, variant) => setLast({ id, variant })}
      />
      <p
        data-testid="last-change"
        data-slide-id={last?.id ?? ''}
        data-variant-id={last?.variant?.id ?? ''}
      />
    </div>
  );
}

/**
 * The lineup as published leads, and is what a reader is looking at first.
 *
 * The owner's note: "we should actually have the OG line up as the first
 * slide". Before this the gallery was the four card views alone, so switching
 * it on REPLACED the plate — an author who wanted to offer some extra formats
 * silently took away the one the reader had. Leading with it makes the opt-in
 * additive, which is the only reading of an opt-in that does not surprise
 * whoever ticked it.
 */
export const VerifyLeadingSlideLeadsAndIsSelected: Story = {
  args: { data: DATA },
  render: () => <LeadingSlideHarness />,
  play: async ({ canvasElement }) => {
    const views = viewsOf(canvasElement);
    const pills = pillsOf(canvasElement);

    // (1) It ADDS a slide rather than swapping one out: every card view is
    // still here, with the plate in front of them.
    await expect(views).toHaveLength(LINEUP_CARD_VARIANTS.length + 1);
    await expect(pills).toHaveLength(LINEUP_CARD_VARIANTS.length + 1);
    await expect(views[0]!.dataset.slide).toBe(LEADING_SLIDE_ID);
    await expect(views[0]!.querySelector('[data-testid="leading-plate"]')).not.toBeNull();
    await expect(
      views.slice(1).map((view) => view.dataset.variant),
      'the card views follow it, in order, all of them'
    ).toEqual(LINEUP_CARD_VARIANTS.map((variant) => variant.id));

    // (2) The leading slide is NOT a variant, and does not pretend to be —
    // a host querying `[data-variant]` is asking for something exportable,
    // and this has no frame to export at.
    await expect(views[0]!.dataset.variant).toBeUndefined();
    await expect(pills[0]!.dataset.variant).toBeUndefined();

    // (3) Every slide is still real markup, including the new one — the
    // server-rendering guarantee, extended rather than excused.
    for (const view of views) {
      const style = getComputedStyle(view);
      await expect(style.display).not.toBe('none');
      await expect(style.visibility).not.toBe('hidden');
      await expect(view.offsetWidth).toBeGreaterThan(0);
      await expect(view.offsetHeight).toBeGreaterThan(0);
    }
    for (const view of views.slice(1)) {
      await expect(view.textContent).toContain('Pickford');
      await expect(view.textContent).toContain('Saka');
    }

    // (4) It is what the reader sees FIRST — selected by default, so turning
    // the gallery on changes nothing about the view they land on.
    await expect(views[0]!.dataset.active, 'the plate is the default view').toBe('true');
    await expect(pills[0]!.getAttribute('aria-current')).toBe('true');

    // (5) Named, like every other control — the plate is a view a screen
    // reader has to be able to pick out too.
    await expect(pills[0]!.getAttribute('aria-label')).toBe(LEADING_LABEL);
    await expect(pills[0]!.textContent?.trim()).toBe('');
    await expect(pills[0]!.getAttribute('href')).toBe(`#${views[0]!.id}`);

    // (6) And it is flush with the container, which is where a reader's eye
    // starts.
    await expectFlushEnds(canvasElement);
  },
};

/**
 * A host is told which slide is showing, and told honestly when it is one it
 * cannot export.
 *
 * `onValueChange`'s second argument is now optional, and this is why: the
 * leading slide has no `LineupCardVariant` behind it. A host that staged a
 * capture from a fallback variant here would hand someone a PNG of a card
 * they were not looking at.
 */
export const VerifyLeadingSlideReportsNoVariant: Story = {
  args: { data: DATA },
  render: () => <LeadingSlideHarness />,
  play: async ({ canvasElement }) => {
    const pills = pillsOf(canvasElement);
    const reported = () => canvasElement.querySelector<HTMLElement>('[data-testid="last-change"]')!;

    // A card view reports itself AND its variant.
    await userEvent.click(pills[3]!);
    await waitFor(async () => {
      await expect(reported().dataset.slideId).toBe(LINEUP_CARD_VARIANTS[2]!.id);
      await expect(reported().dataset.variantId).toBe(LINEUP_CARD_VARIANTS[2]!.id);
    });

    // The leading slide reports itself and NO variant.
    await userEvent.click(pills[0]!);
    await waitFor(async () => {
      await expect(reported().dataset.slideId).toBe(LEADING_SLIDE_ID);
      await expect(reported().dataset.variantId, 'the leading slide has no variant to export').toBe(
        ''
      );
    });
  },
};

/**
 * A keyboard reaches the leading slide too.
 *
 * `VerifyKeyboardReachable` covers the card views; this covers the one that is
 * NOT in `LINEUP_CARD_VARIANTS`, which is exactly the kind of slide a
 * list-driven control forgets to wire up.
 */
export const VerifyLeadingSlideIsKeyboardReachable: Story = {
  args: { data: DATA },
  render: () => <LeadingSlideHarness />,
  play: async ({ canvasElement }) => {
    const track = trackOf(canvasElement);
    const pills = pillsOf(canvasElement);

    track.focus();
    await expect(document.activeElement).toBe(track);
    await userEvent.tab();
    await expect(document.activeElement, 'the plate’s indicator is reached first').toBe(pills[0]);

    // And it can be picked from the keyboard, like every other one. Space,
    // which a link ignores natively — see `VerifyKeyboardReachable`.
    await userEvent.click(pills[2]!);
    await waitFor(async () => {
      await expect(pills[2]!.getAttribute('aria-current')).toBe('true');
    });
    pills[0]!.focus();
    pills[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await waitFor(async () => {
      await expect(pills[0]!.getAttribute('aria-current')).toBe('true');
      await expect(viewsOf(canvasElement)[0]!.dataset.active).toBe('true');
    });
  },
};

// ── The per-slide action ─────────────────────────────────────────────────────

/**
 * What a host hands in: the control that takes the card away.
 *
 * The real one is the editor's capture-and-download path. The story only needs
 * a real, focusable button that names the slide it would save, which is what a
 * host's own control has to be.
 */
function SaveAction({ slide }: { slide: LineupCardSlide }) {
  return (
    <button
      type="button"
      data-testid="save-action"
      data-for-slide={slide.id}
      className="h-9 rounded-[8px] bg-red-100 px-4 text-[13px] font-semibold text-white"
    >
      Save {slide.label}
    </button>
  );
}

/**
 * A reader can take the card away.
 *
 * The owner's report: "i can't actually save these images when they're in a
 * slide on desktop... they're meant to be shareable on socials lol". The cards
 * are DOM, not images, so there is nothing for a long-press or a right-click to
 * offer — a gallery of shareable cards with no way to take one fails at the
 * thing it exists for.
 *
 * viz still does not own the button. It asks the host for one per slide and
 * puts it where it cannot end up inside a picture of the card.
 */
export const VerifySlideActionIsOfferedAndExcludedFromCaptures: Story = {
  args: { data: DATA },
  render: () => (
    <div style={{ width: TRACK_WIDTH }}>
      <LineupCardCarousel data={DATA} slideAction={(slide) => <SaveAction slide={slide} />} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const action = () => canvasElement.querySelector<HTMLElement>('[data-testid="save-action"]')!;
    await expect(action(), 'the host’s control must be rendered').not.toBeNull();

    // (1) It is FOR the slide showing, and follows the selection. The reader
    // swipes to a card and the control is offering that card, not the one they
    // started on.
    await expect(action().dataset.forSlide).toBe(LINEUP_CARD_VARIANTS[0]!.id);
    await userEvent.click(pillsOf(canvasElement)[2]!);
    await waitFor(async () => {
      await expect(action().dataset.forSlide).toBe(LINEUP_CARD_VARIANTS[2]!.id);
    });

    // (2) It CANNOT reach a capture of a card. Not filtered out of one —
    // structurally outside every view, so there is no filter to forget.
    const slot = canvasElement.querySelector<HTMLElement>(
      '[data-slot="lineup-card-slide-action"]'
    )!;
    await expect(slot).not.toBeNull();
    await expect(
      slot.closest('[data-slot="lineup-card-view"]'),
      'the action must not live inside a view'
    ).toBeNull();
    await expect(
      slot.closest('[data-slot="lineup-card-track"]'),
      'nor inside the track a host might rasterise whole'
    ).toBeNull();
    // And it is marked for the exclusion filter anyway, for a host that
    // captures a wider root than one card. `captureElementToPng` collapses
    // every `data-export-ignore="true"` node before it measures.
    await expect(slot.getAttribute('data-export-ignore')).toBe('true');

    // (3) Reachable without a pointer, like the indicators — this is read on a
    // phone and on a desktop, and neither one is allowed to be the only way in.
    const button = action();
    button.focus();
    await expect(document.activeElement, 'the action must take focus').toBe(button);
    // Big enough to hit with a thumb.
    await expect(Math.round(button.getBoundingClientRect().height)).toBeGreaterThanOrEqual(36);
  },
};

/**
 * A host that offers nothing gets exactly the gallery it had before.
 *
 * The whole point of asking the host rather than building a button: viz stays
 * usable as a read-only gallery. This pins that the extension point costs a
 * host that ignores it precisely nothing — not an empty wrapper, not a gap
 * held open, no node at all.
 */
export const VerifyNoSlideActionRendersNoChrome: Story = {
  args: { data: DATA },
  render: () => (
    <div style={{ width: TRACK_WIDTH }}>
      <LineupCardCarousel data={DATA} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector('[data-slot="lineup-card-slide-action"]'),
      'no `slideAction` must mean no node'
    ).toBeNull();
    // The gallery itself is untouched by the extension point existing.
    await expect(viewsOf(canvasElement)).toHaveLength(LINEUP_CARD_VARIANTS.length);
    await expect(pillsOf(canvasElement)).toHaveLength(LINEUP_CARD_VARIANTS.length);
  },
};

/**
 * A host can decline PER SLIDE, and the leading plate is the case that matters.
 *
 * The plate is the editor's own reader block and carries its own save control
 * already, so a second one under the carousel would be the same offer made
 * twice. viz does not make that call — it hands the slide over with `variant`
 * unset and the host returns nothing. This asserts the branch a host needs is
 * actually there to branch on.
 */
export const VerifySlideActionCanBeDeclinedForTheLeadingSlide: Story = {
  args: { data: DATA },
  render: () => (
    <div style={{ width: TRACK_WIDTH }}>
      <LineupCardCarousel
        data={DATA}
        leadingSlide={{ label: LEADING_LABEL, content: <LeadingPlate /> }}
        // Exactly the line a host writes: the plate has no frame behind it,
        // so there is nothing to capture and nothing to offer.
        slideAction={(slide) => (slide.variant ? <SaveAction slide={slide} /> : null)}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // The plate leads and is selected, so no action is offered at all.
    await expect(viewsOf(canvasElement)[0]!.dataset.active).toBe('true');
    await expect(
      canvasElement.querySelector('[data-slot="lineup-card-slide-action"]'),
      'the plate carries its own save control; the carousel must not add a second'
    ).toBeNull();

    // Move to a card and the offer appears, for that card.
    await userEvent.click(pillsOf(canvasElement)[1]!);
    await waitFor(async () => {
      const action = canvasElement.querySelector<HTMLElement>('[data-testid="save-action"]');
      await expect(action, 'a card view is savable').not.toBeNull();
      await expect(action!.dataset.forSlide).toBe(LINEUP_CARD_VARIANTS[0]!.id);
    });

    // And back again — declining is not a one-way door.
    await userEvent.click(pillsOf(canvasElement)[0]!);
    await waitFor(async () => {
      await expect(
        canvasElement.querySelector('[data-slot="lineup-card-slide-action"]')
      ).toBeNull();
    });
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
