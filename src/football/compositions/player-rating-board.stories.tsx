import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import { PlayerRatingBoard, type PlayerGrade } from './player-rating-board';
import { argentinaFormation } from '#/test/fixtures/statsbomb-open';

const meta = {
  title: 'Football/Compositions/PlayerRatingBoard',
  component: PlayerRatingBoard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    theme: { control: 'select', options: ['grass', 'dark'] },
    markerSize: { control: { type: 'range', min: 3, max: 6, step: 0.5 } },
    markerVariant: { control: 'select', options: ['confirmed', 'predicted'] },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '640px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PlayerRatingBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleGrades = new Map<string, PlayerGrade>(
  argentinaFormation.positions.map((pos, idx) => [pos.player.id, ((idx % 6) + 1) as PlayerGrade])
);

export const Confirmed: Story = {
  args: {
    formation: argentinaFormation,
    grades: sampleGrades,
    markerVariant: 'confirmed',
    markerSize: 4,
  },
};

export const WithoutTopGradedRing: Story = {
  args: {
    formation: argentinaFormation,
    grades: sampleGrades,
    markerVariant: 'confirmed',
    markerSize: 4,
    emphasiseTopGraded: false,
  },
};

export const Predicted: Story = {
  args: {
    formation: argentinaFormation,
    markerVariant: 'predicted',
    markerSize: 4,
  },
};

export const Empty: Story = {
  args: {
    formation: argentinaFormation,
    markerSize: 4,
  },
};

export const Interactive: Story = {
  render: (args) => {
    const [selectedId, setSelectedId] = useState<string>();
    const grades = useMemo(() => sampleGrades, []);
    return (
      <PlayerRatingBoard
        {...args}
        grades={grades}
        selectedPlayerId={selectedId}
        onPlayerClick={(pos) => setSelectedId(pos.player.id)}
      />
    );
  },
  args: {
    formation: argentinaFormation,
    markerSize: 4,
  },
};
