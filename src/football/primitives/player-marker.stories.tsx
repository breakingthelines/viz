import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlayerMarker } from './player-marker';
import { Pitch } from './pitch';

const meta = {
  title: 'Football/Primitives/PlayerMarker',
  component: PlayerMarker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'range', min: 1, max: 5, step: 0.5 },
    },
    opacity: {
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
    },
    selected: {
      control: 'boolean',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Pitch variant="half">
          <Story />
        </Pitch>
      </div>
    ),
  ],
} satisfies Meta<typeof PlayerMarker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    position: { x: 75, y: 50 },
    size: 2,
    color: 'var(--color-team-home)',
  },
};

export const WithNumber: Story = {
  args: {
    position: { x: 75, y: 50 },
    size: 3,
    number: 10,
    name: 'Player 10',
    color: 'var(--color-team-home)',
  },
};

export const Selected: Story = {
  args: {
    position: { x: 75, y: 50 },
    size: 3,
    number: 7,
    selected: true,
    color: 'var(--color-team-home)',
  },
};

export const AwayTeam: Story = {
  args: {
    position: { x: 70, y: 30 },
    size: 3,
    number: 9,
    color: 'var(--color-team-away)',
  },
};

export const MultipleMarkers: Story = {
  args: {
    size: 5,
  },

  render: () => (
    <>
      <PlayerMarker position={{ x: 60, y: 20 }} number={7} size={2.5} />
      <PlayerMarker position={{ x: 75, y: 50 }} number={10} size={2.5} selected />
      <PlayerMarker position={{ x: 65, y: 80 }} number={11} size={2.5} />
      <PlayerMarker
        position={{ x: 85, y: 50 }}
        number={9}
        size={2.5}
        color="var(--color-team-away)"
      />
    </>
  ),
};
