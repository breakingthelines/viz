import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ShotMap } from './shot-map';
import { argentinaShots, franceShots, allShots } from '#/test/fixtures/statsbomb-open';

const meta = {
  title: 'Football/Compositions/ShotMap',
  component: ShotMap,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    minSize: {
      control: { type: 'range', min: 0.5, max: 3, step: 0.5 },
    },
    maxSize: {
      control: { type: 'range', min: 2, max: 8, step: 0.5 },
    },
    showXgLabels: {
      control: 'boolean',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '500px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ShotMap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ArgentinaShots: Story = {
  args: {
    shots: argentinaShots,
    minSize: 1,
    maxSize: 4,
  },
};

export const FranceShots: Story = {
  args: {
    shots: franceShots,
    minSize: 1,
    maxSize: 4,
  },
};

export const AllShots: Story = {
  args: {
    shots: allShots,
    minSize: 1,
    maxSize: 4,
  },
};

export const WithXgLabels: Story = {
  args: {
    shots: argentinaShots,
    showXgLabels: true,
  },
};

export const Interactive: Story = {
  render: function InteractiveShotMap() {
    const [selectedId, setSelectedId] = useState<string | undefined>();
    const selectedShot = allShots.find((s) => s.id === selectedId);

    return (
      <div className="space-y-4">
        <ShotMap
          shots={allShots}
          selectedShotId={selectedId}
          onShotClick={(shot) => setSelectedId(shot.id)}
        />
        {selectedShot && (
          <div className="p-4 bg-gray-800 rounded text-sm">
            <p>
              <strong>{selectedShot.player?.name}</strong> ({selectedShot.team.shortName})
            </p>
            <p>
              Outcome: {selectedShot.outcome} | xG: {selectedShot.xg?.toFixed(2) ?? 'N/A'}
            </p>
            <p>Minute: {Math.floor(selectedShot.timestamp)}&apos;</p>
          </div>
        )}
      </div>
    );
  },
};

export const CustomColors: Story = {
  args: {
    shots: allShots,
    getColor: (shot) => (shot.team.id === 'arg' ? '#75AADB' : '#002654'),
  },
};
