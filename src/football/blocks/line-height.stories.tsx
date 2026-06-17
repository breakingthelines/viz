import type { Meta, StoryObj } from '@storybook/react';
import { LineHeight } from '#/football/blocks/line-height';
import type { LineHeightPhase } from '#/football/blocks/line-height';

/**
 * Defensive line height & shape — an editorial block that scrubs one team's
 * back line and midfield band across distinct defensive phases, animating the
 * lines, the compactness band, and the line-height metre readout between them.
 *
 * Coordinates are on the 0–100 pitch scale (x: own goal → opposition goal,
 * y: left → right touchline), matching the `Pitch` primitive.
 */
const meta = {
  title: 'Football/Blocks/LineHeight',
  component: LineHeight,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'btl-dark' },
  },
  decorators: [
    (Story) => (
      <div style={{ background: '#0a0a0a', padding: '40px', minHeight: '100vh' }}>
        <div style={{ width: 560, maxWidth: '100%' }}>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof LineHeight>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Argentina, WC2022 — back four + midfield three across three defensive phases.
 * Build-up: line dropped deep (~18m). Mid-block: settled around halfway (~40m).
 * High press: line pushed high to compress the pitch (~58m).
 */
const argentinaPhases: LineHeightPhase[] = [
  {
    label: 'Build-up',
    lineHeightMeters: 18,
    defenders: [
      { x: 17, y: 22 },
      { x: 16, y: 42 },
      { x: 16, y: 58 },
      { x: 18, y: 78 },
    ],
    midfield: [
      { x: 30, y: 30 },
      { x: 28, y: 50 },
      { x: 30, y: 70 },
    ],
  },
  {
    label: 'Mid-block',
    lineHeightMeters: 40,
    defenders: [
      { x: 39, y: 24 },
      { x: 38, y: 43 },
      { x: 38, y: 57 },
      { x: 40, y: 76 },
    ],
    midfield: [
      { x: 52, y: 32 },
      { x: 50, y: 50 },
      { x: 52, y: 68 },
    ],
  },
  {
    label: 'High press',
    lineHeightMeters: 58,
    defenders: [
      { x: 56, y: 26 },
      { x: 55, y: 44 },
      { x: 55, y: 56 },
      { x: 57, y: 74 },
    ],
    midfield: [
      { x: 70, y: 34 },
      { x: 68, y: 50 },
      { x: 70, y: 66 },
    ],
  },
];

export const Default: Story = {
  args: {
    team: 'Argentina',
    color: '#eb0000',
    phases: argentinaPhases,
  },
};

/** Back line only — no midfield band, so the compactness readout is omitted. */
export const BackLineOnly: Story = {
  args: {
    team: 'Argentina',
    color: '#eb0000',
    phases: argentinaPhases.map(({ label, lineHeightMeters, defenders }) => ({
      label,
      lineHeightMeters,
      defenders,
    })),
  },
};

/** A single phase — the scrubber collapses to one segment. */
export const SinglePhase: Story = {
  args: {
    team: 'Argentina',
    color: '#eb0000',
    phases: [argentinaPhases[1]!],
  },
};
