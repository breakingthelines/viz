import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { LineupCard, LINEUP_CARD_FRAME_SIZE } from './lineup-card';
import { LineupList } from './lineup-list';
import { LineupPitch } from './lineup-pitch';
import type { LineupSlot, LineupSlotPlayer } from './lineup-pitch';
import { getFormationTemplate } from '#/football/data/formations';
import { captureElementToPng } from '#/utils/export';

/**
 * The BTL lineup social export card, at all four of its authored frames.
 *
 * Every story renders at the card's TRUE pixel size (1212x1200 / 1000x1200),
 * not a scaled preview — see `LineupCard`'s module doc for why that is a
 * correctness requirement of the capture path rather than a presentation
 * choice. `Verify/CaptureIsExactFrameSize` measures it.
 */
const meta = {
  title: 'Football/Compositions/LineupCard',
  component: LineupCard,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: {
    frame: { control: 'select', options: ['square', 'portrait'] },
  },
} satisfies Meta<typeof LineupCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Hero photograph stand-ins.
 *
 * Deliberately tiny inline JPEGs rather than remote URLs: the stories run in
 * a headless browser in CI, and a card whose hero is a network fetch would
 * make both the visual stories and the capture measurement flaky for reasons
 * that have nothing to do with this component. Real usage passes an author's
 * uploaded photo URL — the shape and crop behaviour are identical, these just
 * stand in for the subject.
 */
const HERO_WARM =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA8LDA0MCg8NDA0REA8SFyYZFxUVFy8iJBwmODE7OjcxNjU9RVhLPUFUQjU2TWlOVFteY2RjPEpsdGxgc1hhY1//2wBDARARERcUFy0ZGS1fPzY/X19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX1//wAARCAB6ALADASIAAhEBAxEB/8QAGgABAAMBAQEAAAAAAAAAAAAAAAEDBAUCBv/EACUQAQACAgEDBAIDAAAAAAAAAAABAgMRIQQFQRIxMlEUIjM0cf/EABcBAQEBAQAAAAAAAAAAAAAAAAACAwH/xAAbEQEAAgMBAQAAAAAAAAAAAAAAAQIRITEDUf/aAAwDAQACEQMRAD8A+LAdWAAAAAAAAAAAAAAAAAAAAADgAAv6fpr5p44j7eMOOcuSKw7eKkY6RWPCLWwutcskdvx65mdsnUdJfDzHNXZRasWrMT7Szi8rmsPnhd1WGcWWY8KW0bYgDoAAAAAAAAAACAEiAHQ7ZSJta306bF23+Gf9bWFutq8AEKYe5UiccW8w5bs9d/Xs4renGV+pEC0JEAJEAJEAJEAJEAAAAAOp2y0Tjmre5Hb8voy+mZ4l12F422rOgBCmXr7RXp5j7cZ0O5ZdzFIn2c9vSNMbTsAWkAAAAAAAAAAAABZjpvmXYjLicVZiYt7Ov0+aL1iJnmHNTEzE7iVW84mHa2xLsKs2WuOs88sP5GTWtq7Wm07mds6+O9rn0+Ks0Te038qGpXkp5hpavxnlSAh0AAAAAAAAAAABNY3OmmI1GlWGPK1rSNJkAW4AAAODPevps8rs0cbUsbRiVQAOOgAAAAAAAAgBoxR+r284/hD02jiABQAAAA83jdZZ2m3xllZX67CRAhSRACRACRACRACRAAADRindXtVh9pWtq8RIAoAAAAebzqsszRl+LOyv1UACHQAAAAAAAH/2Q==';
const HERO_COOL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA8LDA0MCg8NDA0REA8SFyYZFxUVFy8iJBwmODE7OjcxNjU9RVhLPUFUQjU2TWlOVFteY2RjPEpsdGxgc1hhY1//2wBDARARERcUFy0ZGS1fPzY/X19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX1//wAARCAB6ALADASIAAhEBAxEB/8QAGwABAAIDAQEAAAAAAAAAAAAAAAEGBAUHAwL/xAArEAEAAgIBAwMDAgcAAAAAAAAAAQIDEQQFBiESEzEUQVE0ciIjMjVScZH/xAAYAQEAAwEAAAAAAAAAAAAAAAAAAQIEA//EAB0RAQACAgMBAQAAAAAAAAAAAAABAgMREiExIkH/2gAMAwEAAhEDEQA/AKgIEuaRACRACRACRACRACRACRACRACRACRAAAJAAAAAAAAAemHFObLXHX5mQe/C4OXmX9NI8feW+x9u4YpHrvM2bLp/ErxOPWkR515llOFrz+NNccRHapdQ6Jk49ZyYp9VIaeY1OpdEtWLVmJjcSp/W+D9LyJvWP4LeV6X31LnkpruGrAdHIAAABAAAAAAAAAADb9vYoyc31TH9MNQsfbERvLKt+oXpH0sYDM1jV9fwxk4M215q2jF6jETwsu/8U19VtG4URCZ+ZQ1MYAAAAAAAAAAAAAAsHbOSIyZKfeVfbDo/I+n5tZmdRbxKto3C1J1ZdgiYmImPiRmaxh9VyRj4GSZ+8aZjR9x8mKYIwxPm3ytWNyi06hVp+ZQDSxgAAAIAAAAAAAAABKwdB7ey8+0Zsu6Yonf+ztros9Qze7miYxVn/roeHFTDjjHjrFax8RAmIavNwvYrWKbmsRpjt/MRMamHhbi4rTuauVse/HeuTXrVYsVstoiIYXXe3J5VPfwW/mVj4/Kz0x0pGqxp9LVpxUvbk45mxXw5Jx5KzW0fMS83Qu5ehY+VhtycFdZaxudfdz+9Zpaa2jUwu5PkAAAAAAAAAAAB7cXBbkcimKkbm06eKx9ncWM3UfctHikbErx0vh14XCx4axqYjyzAEgAAAExExMT8S5z3X036TnTlpXWPJ5dGaHuzixn6Xa2t2p5gJc2AFQAEAAAAAAAAL32Pg9PHy5t/M6UR0Hsn+3X/AHCYWcASAAAAMXqOL3uDmpvW6yynlyv02T9sg5Bmr6M16/idPN7cr9Tk/dLxFQAAASAAAAAAL12Pn9XHy4dfE7UVbex5n6rLG/GgXsASAAAAMXqOX2eDmvreqyymq7imY6Rm1P2By/Nb15r2/M7fBPzIIAAf/9k=';

/**
 * The Figma file's own sample XI, in team-sheet order. Reece James wears the
 * armband, which is what exercises the captain badge in the portrait frames.
 */
const ENGLAND_XI: LineupSlotPlayer[] = [
  { id: 'pickford', name: 'Jordan Pickford', shirtNumber: 1 },
  { id: 'james', name: 'Reece James', shirtNumber: 24, isCaptain: true },
  { id: 'stones', name: 'John Stones', shirtNumber: 2 },
  { id: 'colwill', name: 'Levi Colwill', shirtNumber: 6 },
  { id: 'oreilly', name: 'O’Reilly', shirtNumber: 3 },
  { id: 'rice', name: 'Declan Rice', shirtNumber: 4 },
  { id: 'anderson', name: 'Elliot Anderson', shirtNumber: 8 },
  { id: 'palmer', name: 'Cole Palmer', shirtNumber: 7 },
  { id: 'bellingham', name: 'Jude Bellingham', shirtNumber: 10 },
  { id: 'kane', name: 'Harry Kane', shirtNumber: 9 },
  { id: 'saka', name: 'Bukayo Saka', shirtNumber: 18 },
];

/**
 * The same XI laid onto a 4-3-3, for the pitch body.
 *
 * `x` is MIRRORED (`100 - x`) so the keeper sits at the TOP of the pitch and
 * the front three at the bottom, which is how the Figma pitch frame draws it.
 * viz's `portrait` orientation is defined the other way up — own goal at the
 * bottom, attacking UP the screen — because that is the convention the
 * editor's Lineup block and the Match Centre already ship.
 *
 * This needs no new prop and is not a hack: `variant="full"` draws a complete
 * pitch, which is symmetric under a 180-degree rotation (penalty area, goal
 * area, penalty spot and arc at BOTH ends, plus a centred halfway line, circle
 * and spot). So mirroring where the players sit is exactly equivalent to
 * turning the pitch around, and nothing about the markings gives it away.
 * Only the XI's own coordinates change — the formation template itself is
 * untouched, and `LineupPitch` is unmodified.
 */
function englandSlots(): LineupSlot[] {
  const template = getFormationTemplate('4-3-3');
  const order = [
    ENGLAND_XI[0],
    ENGLAND_XI[1],
    ENGLAND_XI[2],
    ENGLAND_XI[3],
    ENGLAND_XI[4],
    ENGLAND_XI[5],
    { id: 'wharton', name: 'Adam Wharton', shirtNumber: 14 },
    ENGLAND_XI[8],
    ENGLAND_XI[7],
    ENGLAND_XI[9],
    ENGLAND_XI[10],
  ];
  return template.map((slot, i) => ({
    x: 100 - slot.x,
    y: slot.y,
    role: slot.role,
    player: order[i],
  }));
}

/**
 * The pitch body, restyled for the card.
 *
 * Everything the Figma pitch frame asks for comes out of `LineupPitch`'s
 * EXISTING props — `orientation`, `markerContent`, `showNames`, `lineColor`,
 * plus the dark theme's own `#1f1f1f` grass default, which already matches
 * the file. No new props were needed.
 *
 * `orientation` is passed explicitly rather than left to the default: the
 * card must keep drawing a portrait pitch regardless of what that default
 * happens to be.
 *
 * `teamName`/`formation` are deliberately NOT passed. `LineupPitch` prints
 * its own team + formation chip above the pitch in read-only mode, and the
 * card already carries both in its own headline and footer — omitting them is
 * what suppresses the duplicate, with no new prop required.
 *
 * `pitchPadding` is the ONE prop this frame needed adding to `LineupPitch`
 * (see its doc). At the hardcoded default of 7 the padded viewBox shrinks the
 * drawn pitch to ~425px inside the card's 515px column — a dead gutter the
 * Figma does not have, where it runs the pitch to both edges of the panel.
 * 1.7 sizes the drawing to the slot's full 734px height, the dimension the
 * eye actually reads in this composition, leaving it ~5% narrower than the
 * Figma's. That last 5% is unreachable honestly: the Figma pitch graphic is
 * stretched to 515x734 (aspect 0.702) while a real pitch — and so viz's — is
 * 2:3 (0.667), and matching the width as well would mean distorting the
 * pitch. Nothing else about the frame needed a new prop.
 *
 * `shrink-0` stops the flex slot from squeezing the pitch: without it the
 * pitch collapses to ~420px wide and floats in the middle of the slot.
 */
function CardPitch() {
  return (
    <LineupPitch
      slots={englandSlots()}
      orientation="portrait"
      markerContent="headshot"
      showNames
      editable={false}
      theme="dark"
      // The Figma pitch is a hairline drawing on the card's own dark ground,
      // far lighter than `Pitch`'s `#2b2b2b` dark-theme default. Grass is left
      // unset — `LineupPitch`'s dark default is already the file's `#1f1f1f`.
      lineColor="rgba(255,255,255,0.5)"
      // 5.0 viewBox units of RADIUS ≈ a 64px headshot on this 515px-wide
      // pitch, which is what the Figma draws. The component's own 3.34 default
      // was tuned for the reader plate's much wider pitch and reads small here.
      markerSize={5}
      pitchPadding={1.7}
      // No headshot URLs in a story that must not touch the network, so every
      // marker falls back to a monogram disc. Neutral `#2b2b2b` (the file's
      // own chip grey) rather than the default team blue, which would be the
      // only saturated colour on an otherwise monochrome card.
      teamColor="#2b2b2b"
      className="w-full shrink-0"
    />
  );
}

/** Figma 3048:11243 — square, split panel, text team sheet on the right. */
export const SquareList: Story = {
  args: {
    frame: 'square',
    title: 'Alternative England XI',
    eyebrow: 'Lineup',
    formation: '4-3-3',
    heroImageUrl: HERO_WARM,
    heroFocalPoint: { x: 0.5, y: 0.5 },
    children: null,
  },
  render: (args) => (
    <LineupCard {...args}>
      <LineupList players={ENGLAND_XI} />
    </LineupCard>
  ),
};

/** Figma 3048:11311 — square, split panel, portrait pitch on the right. */
export const SquarePitch: Story = {
  args: {
    frame: 'square',
    title: 'Alternative England XI',
    eyebrow: 'Lineup',
    heroImageUrl: HERO_WARM,
    heroFocalPoint: { x: 0.5, y: 0.5 },
    children: null,
  },
  render: (args) => (
    <LineupCard {...args}>
      <CardPitch />
    </LineupCard>
  ),
};

/** Figma 3049:11491 — portrait, full-bleed photo, team sheet overlaid left. */
export const PortraitList: Story = {
  args: {
    frame: 'portrait',
    title: 'Alternative England XI',
    eyebrow: 'Lineup',
    formation: '4-3-3',
    heroImageUrl: HERO_WARM,
    // The Figma crop (`left: -14.93%` at `width: 173.06%`) is this cover-crop
    // with x ≈ 0.204 — the subject sits left of centre in the source frame.
    heroFocalPoint: { x: 0.204, y: 0.5 },
    children: null,
  },
  render: (args) => (
    <LineupCard {...args}>
      <LineupList players={ENGLAND_XI} />
    </LineupCard>
  ),
};

/**
 * Figma 3049:11549 — the same portrait template, a different photo and a
 * 4-4-2. Proves the template is genuinely reusable rather than tuned to one
 * set of content.
 */
export const PortraitListAltPhoto: Story = {
  args: {
    frame: 'portrait',
    title: 'Alternative England XI',
    eyebrow: 'Lineup',
    formation: '4-4-2',
    heroImageUrl: HERO_COOL,
    heroFocalPoint: { x: 0.62, y: 0.42 },
    children: null,
  },
  render: (args) => (
    <LineupCard {...args}>
      <LineupList players={ENGLAND_XI} />
    </LineupCard>
  ),
};

/** Decode a data-URL PNG far enough to read its real pixel dimensions. */
function decodeSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('decode failed'));
    img.src = dataUrl;
  });
}

/**
 * Verification story (not a product story): runs the REAL
 * `captureElementToPng` over a real `LineupCard` and measures the PNG that
 * comes out, so the card's "authored at an exact size" claim is a measurement
 * rather than an assertion.
 *
 * It checks three things that a screenshot could not:
 *
 *  1. The card LAYS OUT at exactly its frame size in the live DOM. This is
 *     the load-bearing one: `html-to-image` clones an already-laid-out node,
 *     so the capture's `width`/`height` size the cloned root but cannot make
 *     its descendants reflow. A card that rendered at some other size would
 *     rasterise that other layout onto a correctly-sized canvas, and the bug
 *     would be invisible in the output dimensions alone.
 *  2. The captured PNG decodes at exactly the frame size at `scale: 1`.
 *  3. `scale: 2` doubles both axes — the retina path social platforms want.
 *
 * Runs against BOTH frames, since their sizes differ on the width axis only
 * and a mixed-up frame lookup would still produce a plausible-looking card.
 */
export const CaptureIsExactFrameSize: Story = {
  args: {
    frame: 'portrait',
    title: 'Alternative England XI',
    formation: '4-3-3',
    heroImageUrl: HERO_WARM,
    children: null,
  },
  render: () => (
    <div>
      <LineupCard
        frame="portrait"
        title="Alternative England XI"
        formation="4-3-3"
        heroImageUrl={HERO_WARM}
        heroFocalPoint={{ x: 0.204, y: 0.5 }}
      >
        <LineupList players={ENGLAND_XI} />
      </LineupCard>
      <LineupCard
        frame="square"
        title="Alternative England XI"
        formation="4-3-3"
        heroImageUrl={HERO_WARM}
      >
        <LineupList players={ENGLAND_XI} />
      </LineupCard>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const cards = canvasElement.querySelectorAll<HTMLElement>('[data-slot="lineup-card"]');
    expect(cards).toHaveLength(2);

    for (const card of Array.from(cards)) {
      const frame = card.dataset.frame as 'square' | 'portrait';
      const { width, height } = LINEUP_CARD_FRAME_SIZE[frame];

      // (1) Laid out at the true frame size BEFORE any capture happens.
      expect(card.offsetWidth, `${frame} card must lay out at its authored width`).toBe(width);
      expect(card.offsetHeight, `${frame} card must lay out at its authored height`).toBe(height);

      // (2) 1x capture decodes at exactly the frame size.
      const oneX = await captureElementToPng(card, {
        width,
        height,
        scale: 1,
        backgroundColor: '#151515',
      });
      const oneXSize = await decodeSize(oneX);
      expect(oneXSize, `${frame} PNG must decode at exactly ${width}x${height}`).toEqual({
        width,
        height,
      });

      // (3) 2x capture doubles both axes — the retina density social
      // platforms want.
      //
      // Deliberately only on the PORTRAIT frame, not both. `export.ts`
      // documents that `captureElementToPng`'s timing gets measurably less
      // reliable under heavy parallel load, with
      // `pass-sonar-save-padding.stories.tsx` as the canary; a second 2x
      // capture here would add another ~5.8M-pixel canvas to a suite that
      // already runs its stories in parallel, for no extra information. One
      // frame is enough to prove `scale` multiplies both axes — the per-frame
      // sizing is already covered by (2) above, on both frames.
      if (frame !== 'portrait') continue;
      const twoX = await captureElementToPng(card, {
        width,
        height,
        scale: 2,
        backgroundColor: '#151515',
      });
      const twoXSize = await decodeSize(twoX);
      expect(twoXSize, `${frame} PNG at scale 2 must be ${width * 2}x${height * 2}`).toEqual({
        width: width * 2,
        height: height * 2,
      });
    }
  },
};

/**
 * Verification story (not a product story): measures the card's INTERNAL
 * geometry against the Figma file's own numbers.
 *
 * Frame 3048:11311 draws its body slot at exactly 515x734px, at x 648 / y 418
 * inside the 1212x1200 artboard. Those four numbers only come out right if
 * the content column's asymmetric insets, the 48px and 80px gaps AND the
 * cap-height text trim are all correct together, so they catch almost any
 * drift in the card's rhythm at once. In particular they catch the failure
 * that is easiest to ship by accident: dropping the text trim, which
 * shortens the slot by ~48px while leaving the card looking perfectly
 * plausible on its own.
 *
 * Configured like the pitch frame (no `formation`, so no footer) but with a
 * list body, purely because `LineupList` fills the slot exactly and so gives
 * the measurement a box to read — `LineupPitch` keeps its own aspect ratio
 * and is centred within the slot, so it would measure its own height, not
 * the slot's.
 */
export const MatchesFigmaBodySlot: Story = {
  args: {
    frame: 'square',
    title: 'Alternative England XI',
    heroImageUrl: HERO_WARM,
    children: null,
  },
  render: (args) => (
    <LineupCard {...args}>
      <LineupList players={ENGLAND_XI} />
    </LineupCard>
  ),
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>('[data-slot="lineup-card"]')!;
    const body = canvasElement.querySelector<HTMLElement>('[data-slot="lineup-list"]')!;

    const cardBox = card.getBoundingClientRect();
    const bodyBox = body.getBoundingClientRect();

    // 1px. The slot's position is font-metric INDEPENDENT — every height
    // feeding it comes from `capTrim`'s pinned constants, not from measured
    // glyphs — so this is genuinely exact rather than approximately right,
    // and measures 515x734 @ 648,418 on the nose. The one thing it does
    // depend on is the headline wrapping to two lines, which needs Inter
    // (Storybook loads it); a fallback face wide enough to wrap to three
    // would legitimately change the layout and should fail here.
    const TOLERANCE = 1;
    const near = (actual: number, expected: number, what: string) => {
      expect(
        Math.abs(actual - expected),
        `${what}: expected ~${expected}px from Figma 3048:11311, got ${actual.toFixed(2)}px`
      ).toBeLessThanOrEqual(TOLERANCE);
    };

    near(bodyBox.left - cardBox.left, 648, 'body slot left edge');
    near(bodyBox.width, 515, 'body slot width');
    near(bodyBox.top - cardBox.top, 418, 'body slot top edge');
    near(bodyBox.height, 734, 'body slot height');
  },
};
