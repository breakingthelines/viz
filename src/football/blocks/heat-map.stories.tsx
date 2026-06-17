import type { Meta, StoryObj } from '@storybook/react';
import { HeatMap } from '#/football/blocks/heat-map';
import type { HeatMapPlayer, HeatMapTouch } from '#/football/blocks/heat-map';

const meta = {
  title: 'Football/Blocks/HeatMap',
  component: HeatMap,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'btl-dark' },
  },
  // Dark editorial page wrapper, mirroring the BTL reader surface.
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HeatMap>;

export default meta;
type Story = StoryObj<typeof meta>;

/* -------------------------------------------------------------------------- */
/*  Mock data — a possession side (Spain-at-WC2022 shape).                    */
/*  StatsBomb coords: x 0..120 (own → opp goal), y 0..80 (left → right).      */
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

const rng = makeRng(20221127);

/** Box–Muller normal sample, clamped to the pitch. */
function blob(
  count: number,
  mx: number,
  my: number,
  sx: number,
  sy: number,
  player: string
): HeatMapTouch[] {
  const out: HeatMapTouch[] = [];
  for (let i = 0; i < count; i++) {
    const u1 = Math.max(rng(), 1e-6);
    const u2 = rng();
    const mag = Math.sqrt(-2 * Math.log(u1));
    const x = mx + sx * mag * Math.cos(2 * Math.PI * u2);
    const y = my + sy * mag * Math.sin(2 * Math.PI * u2);
    out.push({
      x: Math.min(119, Math.max(1, x)),
      y: Math.min(79, Math.max(1, y)),
      player,
    });
  }
  return out;
}

const PLAYERS: HeatMapPlayer[] = [
  { id: 'busquets', name: 'Busquets' }, // holding mid — heavy central, deep-middle
  { id: 'pedri', name: 'Pedri' }, // left-side interior
  { id: 'gavi', name: 'Gavi' }, // right-side interior
  { id: 'olmo', name: 'Olmo' }, // left winger — hugs left touchline, advanced
  { id: 'azpi', name: 'Azpilicueta' }, // right-back — overlaps high right
];

// Each player's signature region. Together they make a possession side: deep
// + middle thirds dense and central, fanning wide on both flanks.
const TOUCHES: HeatMapTouch[] = [
  ...blob(78, 52, 40, 13, 11, 'busquets'),
  ...blob(70, 66, 27, 14, 12, 'pedri'),
  ...blob(66, 64, 54, 13, 12, 'gavi'),
  ...blob(58, 82, 70, 16, 8, 'olmo'),
  ...blob(54, 74, 12, 18, 8, 'azpi'),
];

export const Default: Story = {
  args: {
    team: 'Spain',
    color: '#eb0000',
    touches: TOUCHES,
    players: PLAYERS,
  },
};

/** No named players — an unfiltered team cloud (the filter row is hidden). */
export const NoFilter: Story = {
  args: {
    team: 'Spain',
    color: '#eb0000',
    touches: TOUCHES,
  },
};

/** A different accent: a possession side rendered in deep blue. */
export const BlueAccent: Story = {
  args: {
    team: 'Italy',
    color: '#3b6fe0',
    touches: TOUCHES,
    players: PLAYERS,
  },
};
