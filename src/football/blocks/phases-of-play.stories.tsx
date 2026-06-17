import type { Meta, StoryObj } from '@storybook/react-vite';
import { PhasesOfPlay } from './phases-of-play';
import type { Phase } from './phases-of-play';

const meta = {
  title: 'Football/Blocks/PhasesOfPlay',
  component: PhasesOfPlay,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ background: '#0a0a0a', padding: 48 }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof PhasesOfPlay>;

export default meta;
type Story = StoryObj<typeof meta>;

// A possession-heavy side at WC2022: lots of build-up, a healthy share
// progressed, a narrower final-third entry, and a believable shot conversion.
const SPAIN_PHASES: Phase[] = [
  { key: 'build_up', label: 'Build-up', sequences: 151 },
  { key: 'progression', label: 'Progression', sequences: 102 },
  { key: 'final_third', label: 'Final third', sequences: 45 },
  { key: 'shot', label: 'Shot', sequences: 14 },
];

/** Spain — a possession-dominant side, wide funnel with a steep final drop. */
export const Default: Story = {
  args: {
    team: 'Spain',
    phases: SPAIN_PHASES,
  },
};

// A sharper, more direct team: fewer build-up sequences but a higher share that
// reaches the final third and becomes a shot — the funnel narrows less steeply.
const ENGLAND_PHASES: Phase[] = [
  { key: 'build_up', label: 'Build-up', sequences: 118 },
  { key: 'progression', label: 'Progression', sequences: 91 },
  { key: 'final_third', label: 'Final third', sequences: 52 },
  { key: 'shot', label: 'Shot', sequences: 19 },
];

/** England — more direct: a smaller mouth but a more efficient run to a shot. */
export const Direct: Story = {
  args: {
    team: 'England',
    color: '#0091eb',
    phases: ENGLAND_PHASES,
  },
};
