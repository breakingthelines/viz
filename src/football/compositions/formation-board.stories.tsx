import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';
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
    theme: {
      control: 'select',
      options: ['grass', 'dark'],
    },
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
    orientation: {
      control: 'select',
      options: ['landscape', 'portrait'],
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

/**
 * Dark theme — the Lineups tab look. Near-black pitch with white lines so the
 * formation sits on the Match Centre photo-hero surface.
 */
export const Dark: Story = {
  args: {
    formation: argentinaFormation,
    theme: 'dark',
    showNumbers: true,
    markerSize: 3,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px', background: '#0d0d0d', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
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

/**
 * Portrait orientation — the pitch rotated a quarter-turn so the GK (E.
 * Martínez, `x: 5` — near the own goal) renders at the BOTTOM and the
 * forward line (Di María/Messi/Álvarez, `x: 60–65` — near the opposition
 * goal) at the TOP. `orientation` composes with `flip` cleanly since it
 * applies AFTER it (see {@link FormationBoardProps.orientation}) — this
 * story doesn't flip, but the ordering is what lets a future caller combine
 * both without a special case. Marker content (numbers) stays upright.
 */
export const Portrait: Story = {
  args: {
    formation: argentinaFormation,
    theme: 'dark',
    orientation: 'portrait',
    showNumbers: true,
    markerSize: 3,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px', background: '#0d0d0d', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg') as SVGSVGElement | null;
    expect(svg, 'pitch SVG present').not.toBeNull();
    expect(svg!.getAttribute('class') ?? '').toContain('aspect-[2/3]');

    const gk = canvasElement.querySelector('[aria-label="E. Martínez"]');
    expect(gk, 'GK marker present').not.toBeNull();
    const gkY = Number(gk!.querySelector('circle')!.getAttribute('cy'));

    for (const name of ['Á. Di María', 'L. Messi', 'J. Álvarez']) {
      const marker = canvasElement.querySelector(`[aria-label="${name}"]`);
      expect(marker, `${name} marker present`).not.toBeNull();
      const forwardY = Number(marker!.querySelector('circle')!.getAttribute('cy'));
      expect(gkY, `GK renders below ${name} (larger screen y)`).toBeGreaterThan(forwardY);
    }

    // Marker content stays upright: no rotate transform on the GK's group or
    // its shirt-number text.
    expect(gk!.getAttribute('transform'), 'GK marker group unrotated').toBeNull();
    const gkNumber = gk!.querySelector('text');
    expect(gkNumber, 'GK number glyph present').not.toBeNull();
    expect(gkNumber!.getAttribute('transform'), 'number glyph unrotated').toBeNull();
  },
};
