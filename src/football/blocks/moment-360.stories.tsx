import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Moment360 } from './moment-360';
import type { MomentPlayer, MomentPassingOption, MomentPoint } from './moment-360';
import { observeCircleRadii } from '#/test/console-spy';
import { expectSvgContentVisibleOnFirstFrame, withReducedMotion } from '#/test/entrance-lock';

const meta = {
  title: 'Football/Blocks/Moment360',
  component: Moment360,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ background: '#0a0a0a', padding: 48 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof Moment360>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Argentina (home, red) build-up, ~62'. Messi receives between the lines on
// the right half-space (~55,40 in StatsBomb 120×80) and lifts his head. The
// camera held the attacking 60% of the pitch; France sit in a mid-block. ---

// France's mid-block: a back line, a midfield screen, the keeper deep. Coords
// are StatsBomb 120×80, with low x = Argentina's own half.
const FRANCE_BLOCK: MomentPlayer[] = [
  // Keeper (Lloris), deep on his line.
  { x: 114, y: 40, teammate: false, keeper: true },
  // Back four, holding around the edge of the box.
  { x: 96, y: 18, teammate: false, keeper: false }, // RB Koundé
  { x: 99, y: 31, teammate: false, keeper: false }, // RCB Varane
  { x: 99, y: 49, teammate: false, keeper: false }, // LCB Upamecano
  { x: 96, y: 62, teammate: false, keeper: false }, // LB T. Hernández
  // Midfield screen ahead of the line, the nearest two pressing Messi.
  { x: 70, y: 30, teammate: false, keeper: false }, // Tchouaméni, stepping
  { x: 66, y: 46, teammate: false, keeper: false }, // Rabiot, closing
  { x: 78, y: 58, teammate: false, keeper: false }, // Griezmann tucked in
  // A forward dropping to cover the pivot.
  { x: 58, y: 22, teammate: false, keeper: false }, // Dembélé tracking back
  // Far-side winger, low and wide.
  { x: 84, y: 70, teammate: false, keeper: false }, // Mbappé resting wide
];

// Argentina team-mates around the ball — the shape that creates the options.
const ARGENTINA_MATES: MomentPlayer[] = [
  // Runner in behind the right channel (between RB and RCB) — free.
  { x: 92, y: 24, teammate: true, keeper: false }, // J. Álvarez, in behind
  // Overlapping full-back high on the right.
  { x: 86, y: 12, teammate: true, keeper: false }, // Molina overlapping
  // Late runner arriving between the lines, central — free.
  { x: 84, y: 44, teammate: true, keeper: false }, // E. Fernández, ghosting in
  // Left-sided forward pinning the France right-back.
  { x: 88, y: 66, teammate: true, keeper: false }, // Mac Allister wide left
  // Pivot offering the simple ball back.
  { x: 46, y: 50, teammate: true, keeper: false }, // De Paul, recycle option
  // Deeper supporting players.
  { x: 40, y: 30, teammate: true, keeper: false }, // RCB Romero
  { x: 38, y: 52, teammate: true, keeper: false }, // LCB Otamendi
  { x: 30, y: 66, teammate: true, keeper: false }, // LB Tagliafico
  { x: 22, y: 40, teammate: true, keeper: false }, // GK area / spare man
];

const ALL_PLAYERS: MomentPlayer[] = [...FRANCE_BLOCK, ...ARGENTINA_MATES];

// The camera's tracked zone — roughly the attacking 60% of the pitch, a little
// wider near the ball and narrowing toward the far corners. StatsBomb coords.
const VISIBLE_AREA: MomentPoint[] = [
  { x: 44, y: 6 },
  { x: 120, y: 8 },
  { x: 120, y: 74 },
  { x: 50, y: 72 },
  { x: 42, y: 40 },
];

// Four options off Messi's right foot. Coverage is COMPUTED from the freeze-
// frame (no hand-set inSpace): a receiver is "covered" when a France defender is
// within ~6.5m, otherwise in space. So Mac Allister (Mbappé/Hernández tight) is
// covered; Álvarez in behind, Fernández between the lines, and De Paul on the
// recycle are all unmarked.
const PASSING_OPTIONS: MomentPassingOption[] = [
  { x: 92, y: 24, player: 'J. Álvarez' }, // run in behind the right channel
  { x: 84, y: 44, player: 'E. Fernández' }, // ghosting in between the lines
  { x: 88, y: 66, player: 'A. Mac Allister' }, // wide left, picked up
  { x: 46, y: 50, player: 'R. De Paul' }, // simple recycle to the pivot
];

const MESSI_ACTOR: MomentPoint = { x: 55, y: 40 };
const MESSI_HEADSHOT =
  'https://upload.wikimedia.org/wikipedia/commons/c/c1/Lionel_Messi_20180626.jpg';
const MBAPPE_HEADSHOT =
  'https://upload.wikimedia.org/wikipedia/commons/e/e5/Kylian_Mbapp%C3%A9_2018.jpg';

/** Argentina build-up, 62': Messi between the lines with two runners free. */
export const Default: Story = {
  args: {
    event: {
      type: 'Carry',
      player: 'L. Messi',
      team: 'home',
      minute: 62,
      imageUrl: MESSI_HEADSHOT,
    },
    actor: MESSI_ACTOR,
    players: ALL_PLAYERS,
    visibleArea: VISIBLE_AREA,
    passingOptions: PASSING_OPTIONS,
  },
};

/** Same instant, a through ball threaded between the lines. */
export const ThroughBall: Story = {
  args: {
    ...Default.args,
    event: {
      type: 'Through Ball',
      player: 'L. Messi',
      team: 'home',
      minute: 62,
      imageUrl: MESSI_HEADSHOT,
    },
  },
};

/** Actor with no headshot supplied — falls back to the accent dot. */
export const NoHeadshot: Story = {
  args: {
    ...Default.args,
    event: {
      type: 'Carry',
      player: 'L. Messi',
      team: 'home',
      minute: 62,
    },
  },
};

// --- An away-team moment (mirrored): Mbappé receiving in the left half-space
// on the counter, France attacking right→left from the component's view. ---

const ARG_LOW_BLOCK: MomentPlayer[] = [
  { x: 114, y: 40, teammate: false, keeper: true }, // E. Martínez
  { x: 98, y: 22, teammate: false, keeper: false },
  { x: 100, y: 34, teammate: false, keeper: false },
  { x: 100, y: 48, teammate: false, keeper: false },
  { x: 98, y: 60, teammate: false, keeper: false },
  { x: 74, y: 32, teammate: false, keeper: false },
  { x: 70, y: 48, teammate: false, keeper: false },
  { x: 80, y: 60, teammate: false, keeper: false },
  { x: 60, y: 26, teammate: false, keeper: false },
  { x: 86, y: 70, teammate: false, keeper: false },
];

const FRANCE_BREAK: MomentPlayer[] = [
  { x: 94, y: 18, teammate: true, keeper: false }, // Thuram in behind
  { x: 90, y: 44, teammate: true, keeper: false }, // Coman arriving
  { x: 82, y: 66, teammate: true, keeper: false }, // Dembélé wide
  { x: 50, y: 48, teammate: true, keeper: false },
  { x: 44, y: 34, teammate: true, keeper: false },
  { x: 40, y: 54, teammate: true, keeper: false },
  { x: 30, y: 40, teammate: true, keeper: false },
  { x: 26, y: 60, teammate: true, keeper: false },
  { x: 20, y: 44, teammate: true, keeper: false },
];

/** Mirrored away moment: Mbappé on the counter, two runners breaking free. */
export const AwayCounter: Story = {
  args: {
    event: {
      type: 'Carry',
      player: 'K. Mbappé',
      team: 'away',
      minute: 71,
      imageUrl: MBAPPE_HEADSHOT,
    },
    actor: { x: 58, y: 42 },
    players: [...ARG_LOW_BLOCK, ...FRANCE_BREAK],
    visibleArea: VISIBLE_AREA,
    passingOptions: [
      // Thuram is in behind the line — explicitly in-space (a pure distance
      // check would read the chasing defender as cover). The rest compute.
      { x: 94, y: 18, inSpace: true, player: 'M. Thuram' },
      { x: 90, y: 44, player: 'K. Coman' },
      { x: 82, y: 66, player: 'O. Dembélé' },
      { x: 50, y: 48, player: 'A. Tchouaméni' },
    ],
  },
};

/**
 * Regression lock for the transient `<circle r="undefined">` warning (viz #27,
 * item 7). "The Moment" actor's pulse ring is the only animated circle in the
 * package whose radius changes — it MUST animate `scale` (a transform), never
 * the `r` attribute. Animating `r` directly made framer-motion drive the
 * attribute and emit `r="undefined"` for a frame on setup (a React dev warning,
 * verified separately in a dev build).
 *
 * The vitest browser build runs React without dev warnings, so this lock instead
 * watches the pulse ring's `r` attribute every frame across a full pulse cycle:
 * with the correct `scale` animation `r` stays fixed (one distinct value); if a
 * future edit reintroduces an animated `r`, framer would drive the attribute
 * through its keyframes and this set would grow — failing the lock.
 */
export const PulseRingScalesNotRadius: Story = {
  args: { ...Default.args },
  play: async ({ canvasElement }) => {
    // The pulse ring is the lone hairline (stroke-width 0.4) hollow circle.
    const selector = 'circle[fill="none"][stroke-width="0.4"]';
    // Sample > one full pulse cycle (2.4s duration + 0.4s repeatDelay + 0.3s
    // start delay) so any attribute-level radius animation would be caught.
    const radii = await observeCircleRadii(canvasElement, selector, 3400);
    // Exactly one distinct, finite, positive `r` — `scale` drives the swell, not
    // the attribute (and it is never undefined/null).
    expect(radii.length).toBe(1);
    expect(Number.parseFloat(radii[0]!)).toBeGreaterThan(0);
  },
};

/**
 * Entrance-blank lock (viz #28). Every layer of the freeze-frame — the dim
 * world, the lit zone, the lit players, the passing lanes and the actor — opened
 * from `initial={{ opacity: 0 }}` / `pathLength: 0`, so a dropped mount/hydration
 * tick left the whole moment blank. This renders with all framer-motion
 * animation disabled and asserts the lit players (circles) are visible on the
 * first frame without any entrance firing. Locked: every layer uses
 * `initial={false}`.
 */
export const EntranceLock: Story = {
  args: { ...Default.args },
  decorators: [withReducedMotion],
  play: async ({ canvasElement }) => {
    await expectSvgContentVisibleOnFirstFrame(canvasElement, { selector: 'circle', min: 6 });
  },
};
