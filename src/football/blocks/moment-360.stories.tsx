import type { Meta, StoryObj } from '@storybook/react-vite';
import { Moment360 } from './moment-360';
import type { MomentPlayer, MomentPassingOption, MomentPoint } from './moment-360';

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

// Four options off Messi's right foot. Two genuinely in space (the run in
// behind the right channel; the late central runner between the lines), two
// covered (the wide-left pin; the safe recycle to the pivot).
const PASSING_OPTIONS: MomentPassingOption[] = [
  { x: 92, y: 24, inSpace: true, player: 'J. Álvarez' }, // through the channel
  { x: 84, y: 44, inSpace: true, player: 'E. Fernández' }, // between the lines
  { x: 88, y: 66, inSpace: false, player: 'A. Mac Allister' }, // covered wide
  { x: 46, y: 50, inSpace: false, player: 'R. De Paul' }, // safe recycle
];

const MESSI_ACTOR: MomentPoint = { x: 55, y: 40 };

/** Argentina build-up, 62': Messi between the lines with two runners free. */
export const Default: Story = {
  args: {
    event: {
      type: 'Carry',
      player: 'L. Messi',
      team: 'home',
      minute: 62,
    },
    actor: MESSI_ACTOR,
    players: ALL_PLAYERS,
    visibleArea: VISIBLE_AREA,
    passingOptions: PASSING_OPTIONS,
  },
};

/** Same instant, framed editorially as "What They Saw". */
export const WhatTheySaw: Story = {
  args: {
    ...Default.args,
    kicker: 'What They Saw',
    event: {
      type: 'Through Ball',
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
    },
    actor: { x: 58, y: 42 },
    players: [...ARG_LOW_BLOCK, ...FRANCE_BREAK],
    visibleArea: VISIBLE_AREA,
    passingOptions: [
      { x: 94, y: 18, inSpace: true, player: 'M. Thuram' },
      { x: 90, y: 44, inSpace: true, player: 'K. Coman' },
      { x: 82, y: 66, inSpace: false, player: 'O. Dembélé' },
      { x: 50, y: 48, inSpace: false, player: 'A. Tchouaméni' },
    ],
  },
};
