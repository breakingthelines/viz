import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { FormationBoard } from './formation-board';
import { argentinaFormation, franceFormation } from '#/test/fixtures/statsbomb-open';
import type { FormationPosition } from '#/football/types';

const meta = {
  title: 'Football/Compositions/FormationBoard',
  component: FormationBoard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    markerSize: {
      control: { type: 'range', min: 2, max: 5, step: 0.5 },
    },
    showNumbers: {
      control: 'boolean',
    },
    showNames: {
      control: 'boolean',
    },
    flip: {
      control: 'boolean',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FormationBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Argentina: Story = {
  args: {
    formation: argentinaFormation,
    showNumbers: true,
    showNames: false,
    markerSize: 3,
  },
};

export const France: Story = {
  args: {
    formation: franceFormation,
    showNumbers: true,
    showNames: false,
    markerSize: 3,
  },
};

export const WithNames: Story = {
  args: {
    formation: argentinaFormation,
    showNumbers: true,
    showNames: true,
    markerSize: 2.5,
  },
};

export const Flipped: Story = {
  args: {
    formation: franceFormation,
    flip: true,
    showNumbers: true,
  },
};

export const CustomColor: Story = {
  args: {
    formation: argentinaFormation,
    teamColor: '#ef4444',
    showNumbers: true,
  },
};

export const Interactive: Story = {
  render: function InteractiveFormation() {
    const [selected, setSelected] = useState<FormationPosition | null>(null);

    return (
      <div className="space-y-4">
        <FormationBoard
          formation={argentinaFormation}
          showNumbers
          selectedPlayerId={selected?.player.id}
          onPlayerClick={setSelected}
        />
        {selected && (
          <div className="p-4 bg-gray-800 rounded text-sm">
            <p>
              <strong>#{selected.player.number}</strong> {selected.player.name}
            </p>
            <p>Position: {selected.role ?? 'N/A'}</p>
          </div>
        )}
      </div>
    );
  },
};

export const BothTeams: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4" style={{ width: '1000px' }}>
      <FormationBoard formation={argentinaFormation} showNumbers markerSize={2.5} />
      <FormationBoard formation={franceFormation} showNumbers markerSize={2.5} flip />
    </div>
  ),
  decorators: [],
};
