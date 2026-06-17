import type { Meta, StoryObj } from '@storybook/react-vite';
import { PitchControl, type PitchControlPlayer } from './pitch-control';

const meta = {
  title: 'Football/Blocks/PitchControl',
  component: PitchControl,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  // Dark editorial surface, ~720px — the BTL reader page.
  decorators: [
    (Story) => (
      <div style={{ width: '720px', background: '#0a0a0a', padding: '28px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PitchControl>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A settled mid-block snapshot in StatsBomb 120×80 coordinates. The home side
 * is camped higher up the pitch (a sustained press / territorial phase) while
 * the away side defends in a compact mid-low block — so the territory wash
 * tilts home, reading roughly 58 / 42. Both keepers are marked.
 */
const midBlock: PitchControlPlayer[] = [
  // HOME — pushed up, attacking right. GK on the edge of his box.
  { id: 'h-gk', x: 18, y: 40, team: 'home', isGoalkeeper: true },
  { id: 'h-rb', x: 62, y: 8, team: 'home' },
  { id: 'h-rcb', x: 48, y: 30, team: 'home' },
  { id: 'h-lcb', x: 48, y: 50, team: 'home' },
  { id: 'h-lb', x: 62, y: 72, team: 'home' },
  { id: 'h-rcm', x: 72, y: 28, team: 'home' },
  { id: 'h-dm', x: 64, y: 40, team: 'home' },
  { id: 'h-lcm', x: 72, y: 52, team: 'home' },
  { id: 'h-rw', x: 92, y: 14, team: 'home' },
  { id: 'h-st', x: 96, y: 40, team: 'home' },
  { id: 'h-lw', x: 92, y: 66, team: 'home' },

  // AWAY — compact mid-low block, defending its own (right→left mirrored) end.
  { id: 'a-gk', x: 104, y: 40, team: 'away', isGoalkeeper: true },
  { id: 'a-rb', x: 84, y: 70, team: 'away' },
  { id: 'a-rcb', x: 90, y: 50, team: 'away' },
  { id: 'a-lcb', x: 90, y: 30, team: 'away' },
  { id: 'a-lb', x: 84, y: 10, team: 'away' },
  { id: 'a-rcm', x: 70, y: 56, team: 'away' },
  { id: 'a-dm', x: 74, y: 40, team: 'away' },
  { id: 'a-lcm', x: 70, y: 24, team: 'away' },
  { id: 'a-rw', x: 58, y: 60, team: 'away' },
  { id: 'a-st', x: 54, y: 40, team: 'away' },
  { id: 'a-lw', x: 58, y: 20, team: 'away' },
];

export const MidBlock: Story = {
  args: {
    homeTeam: 'Arsenal',
    awayTeam: 'Everton',
    players: midBlock,
  },
};

/**
 * A more balanced, end-to-end shape — both teams holding their own halves with
 * the line of confrontation around the centre. The split bar sits close to
 * 50 / 50 and the wash is calmer through midfield.
 */
const evenGame: PitchControlPlayer[] = [
  // HOME — own half, attacking right.
  { id: 'h-gk', x: 8, y: 40, team: 'home', isGoalkeeper: true },
  { id: 'h-rb', x: 30, y: 12, team: 'home' },
  { id: 'h-rcb', x: 22, y: 32, team: 'home' },
  { id: 'h-lcb', x: 22, y: 48, team: 'home' },
  { id: 'h-lb', x: 30, y: 68, team: 'home' },
  { id: 'h-rcm', x: 44, y: 26, team: 'home' },
  { id: 'h-dm', x: 38, y: 40, team: 'home' },
  { id: 'h-lcm', x: 44, y: 54, team: 'home' },
  { id: 'h-rw', x: 56, y: 16, team: 'home' },
  { id: 'h-st', x: 58, y: 40, team: 'home' },
  { id: 'h-lw', x: 56, y: 64, team: 'home' },

  // AWAY — own half, mirrored, defending the right end.
  { id: 'a-gk', x: 112, y: 40, team: 'away', isGoalkeeper: true },
  { id: 'a-rb', x: 90, y: 68, team: 'away' },
  { id: 'a-rcb', x: 98, y: 48, team: 'away' },
  { id: 'a-lcb', x: 98, y: 32, team: 'away' },
  { id: 'a-lb', x: 90, y: 12, team: 'away' },
  { id: 'a-rcm', x: 76, y: 54, team: 'away' },
  { id: 'a-dm', x: 82, y: 40, team: 'away' },
  { id: 'a-lcm', x: 76, y: 26, team: 'away' },
  { id: 'a-rw', x: 64, y: 64, team: 'away' },
  { id: 'a-st', x: 62, y: 40, team: 'away' },
  { id: 'a-lw', x: 64, y: 16, team: 'away' },
];

export const EvenContest: Story = {
  args: {
    homeTeam: 'Liverpool',
    awayTeam: 'Manchester City',
    players: evenGame,
  },
};
