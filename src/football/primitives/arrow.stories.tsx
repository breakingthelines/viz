import type { Meta, StoryObj } from '@storybook/react-vite';
import { Arrow } from './arrow';
import { Pitch } from './pitch';
import { PlayerMarker } from './player-marker';

const meta = {
  title: 'Football/Primitives/Arrow',
  component: Arrow,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    strokeWidth: {
      control: { type: 'range', min: 0.1, max: 1, step: 0.1 },
    },
    opacity: {
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
    },
    showArrowhead: {
      control: 'boolean',
    },
    curved: {
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
} satisfies Meta<typeof Arrow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    from: { x: 60, y: 30 },
    to: { x: 85, y: 50 },
    color: 'white',
    strokeWidth: 0.4,
    showArrowhead: true,
  },
};

export const Curved: Story = {
  args: {
    from: { x: 55, y: 20 },
    to: { x: 90, y: 50 },
    color: 'white',
    strokeWidth: 0.4,
    showArrowhead: true,
    curved: true,
  },
};

export const Dashed: Story = {
  args: {
    from: { x: 60, y: 70 },
    to: { x: 85, y: 50 },
    color: 'white',
    strokeWidth: 0.3,
    showArrowhead: true,
    dashArray: '1 1',
  },
};

export const NoArrowhead: Story = {
  args: {
    from: { x: 55, y: 50 },
    to: { x: 95, y: 50 },
    color: 'yellow',
    strokeWidth: 0.5,
    showArrowhead: false,
  },
};

export const PassSequence: Story = {
  render: () => (
    <>
      <Arrow from={{ x: 55, y: 30 }} to={{ x: 70, y: 45 }} color="#3b82f6" />
      <Arrow from={{ x: 70, y: 45 }} to={{ x: 85, y: 35 }} color="#3b82f6" />
      <Arrow from={{ x: 85, y: 35 }} to={{ x: 92, y: 50 }} color="#22c55e" curved />
      <PlayerMarker position={{ x: 55, y: 30 }} size={1.5} />
      <PlayerMarker position={{ x: 70, y: 45 }} size={1.5} />
      <PlayerMarker position={{ x: 85, y: 35 }} size={1.5} />
      <PlayerMarker position={{ x: 92, y: 50 }} size={1.5} color="var(--color-marker-goal)" />
    </>
  ),
};
