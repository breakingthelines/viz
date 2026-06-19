import type { Meta, StoryObj } from '@storybook/react-vite';
import { PressMap } from './press-map';
import type { PressEvent } from './press-map';

const meta = {
  title: 'Football/Blocks/PressMap',
  component: PressMap,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'btl-dark' },
  },
  tags: ['autodocs'],
  // Dark editorial page wrapper, mirroring the BTL reader surface.
  decorators: [
    (Story) => (
      <div style={{ background: '#0a0a0a', padding: 48 }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof PressMap>;

export default meta;
type Story = StoryObj<typeof meta>;

/* -------------------------------------------------------------------------- */
/*  Mock data — a high-pressing side (Morocco-at-WC2022 shape).               */
/*  StatsBomb coords: x 0..120 (own → opp goal), y 0..80 (left → right).      */
/*  The team presses left→right, so high x = pressing in the opp third.       */
/*  Deterministic so the bloom looks identical every render.                  */
/* -------------------------------------------------------------------------- */

// Tiny seeded PRNG (mulberry32) — no network, no randomness drift.
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(20221210);

/** Box–Muller normal sample, clamped to the pitch, tagged with a kind. */
function blob(
  count: number,
  mx: number,
  my: number,
  sx: number,
  sy: number,
  kind: PressEvent['kind']
): PressEvent[] {
  const out: PressEvent[] = [];
  for (let i = 0; i < count; i++) {
    const u1 = Math.max(rng(), 1e-6);
    const u2 = rng();
    const mag = Math.sqrt(-2 * Math.log(u1));
    const x = mx + sx * mag * Math.cos(2 * Math.PI * u2);
    const y = my + sy * mag * Math.sin(2 * Math.PI * u2);
    out.push({
      x: Math.min(119, Math.max(1, x)),
      y: Math.min(79, Math.max(1, y)),
      kind,
    });
  }
  return out;
}

// A high press: pressures cluster in the middle + attacking thirds (high x),
// recoveries land just behind the pressure line where the ball breaks loose.
// Light, wide central pressure with two flank traps; sparse deep cover.
const HIGH_PRESS_EVENTS: PressEvent[] = [
  // Pressures — middle/attacking weighted (the press squeezes high).
  ...blob(34, 92, 40, 12, 16, 'pressure'), // central opp-third squeeze
  ...blob(22, 100, 22, 9, 9, 'pressure'), // left trap, high
  ...blob(22, 100, 58, 9, 9, 'pressure'), // right trap, high
  ...blob(24, 70, 40, 13, 18, 'pressure'), // middle-third screen
  ...blob(10, 46, 40, 10, 16, 'pressure'), // a little deep cover
  // Ball recoveries — won just behind the pressure (slightly deeper x).
  ...blob(20, 82, 38, 12, 16, 'recovery'),
  ...blob(12, 62, 40, 12, 16, 'recovery'),
  ...blob(8, 44, 40, 11, 15, 'recovery'),
];

/** The headline view: a high-pressing side with a ~8.7 PPDA. */
export const Default: Story = {
  args: {
    team: 'Morocco',
    crestUrl:
      'https://upload.wikimedia.org/wikipedia/en/thumb/e/e5/Royal_Moroccan_Football_Federation_logo.svg/180px-Royal_Moroccan_Football_Federation_logo.svg.png',
    color: '#eb0000',
    ppda: 8.7,
    events: HIGH_PRESS_EVENTS,
  },
};

/** A different accent: the same press rendered in deep blue. */
export const BlueAccent: Story = {
  args: {
    team: 'Japan',
    color: '#3b6fe0',
    ppda: 9.4,
    events: HIGH_PRESS_EVENTS,
  },
};

/**
 * Caller supplies the thirds split explicitly (used for the unfiltered view).
 * Kept consistent with the plotted cloud so the breakdown and the bloom agree.
 */
export const ExplicitThirds: Story = {
  args: {
    team: 'Morocco',
    color: '#10b981',
    ppda: 8.1,
    events: HIGH_PRESS_EVENTS,
    thirds: { defensive: 13, middle: 53, attacking: 86 },
  },
};
