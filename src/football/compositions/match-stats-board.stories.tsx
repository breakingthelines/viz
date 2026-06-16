import type { Meta, StoryObj } from '@storybook/react-vite';
import { MatchStatsBoard } from './match-stats-board';

const meta = {
  title: 'Football/Compositions/MatchStatsBoard',
  component: MatchStatsBoard,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '460px', padding: '24px', background: '#121212', borderRadius: 12 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MatchStatsBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    homeTeam: { name: 'Arsenal', shortName: 'Arsenal', color: '#eb0000' },
    awayTeam: { name: 'Chelsea', shortName: 'Chelsea', color: '#1d4ed8' },
    stats: [
      { key: 'possession', label: 'Possession', home: 58, away: 42, kind: 'percent' },
      { key: 'shots', label: 'Shots', home: 14, away: 9, kind: 'count' },
      { key: 'shots_on_target', label: 'On target', home: 6, away: 3, kind: 'count' },
      { key: 'xg', label: 'Expected goals', home: 2.1, away: 0.8, kind: 'decimal' },
      { key: 'passes', label: 'Passes', home: 612, away: 438, kind: 'count' },
      { key: 'pass_pct', label: 'Pass accuracy', home: 89, away: 84, kind: 'percent' },
      { key: 'corners', label: 'Corners', home: 7, away: 4, kind: 'count' },
      { key: 'fouls', label: 'Fouls', home: 8, away: 12, kind: 'count' },
    ],
  },
};
