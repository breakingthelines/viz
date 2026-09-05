import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ShotMap } from './shot-map';
import { isShot, shotOutcomeName } from '#/football/types';

/** Minimal assert helper so the play test needs no extra test-runtime import
 * (which would otherwise trigger Vite dep re-optimisation mid browser run). */
function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`ShotMap BothTeams: ${message}`);
}
import {
  argentinaShots,
  franceShots,
  allShots,
  argentinaTeam,
  franceTeam,
} from '#/test/fixtures/statsbomb-open';

const meta = {
  title: 'Football/Compositions/ShotMap',
  component: ShotMap,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    shots: [],
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['half', 'full'],
    },
    theme: {
      control: 'select',
      options: ['grass', 'dark'],
    },
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
    const selectedShotData =
      selectedShot && isShot(selectedShot) ? selectedShot.actionData.value : undefined;

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
              <strong>{selectedShot.player?.name}</strong> ({selectedShot.team?.shortName})
            </p>
            <p>
              Outcome: {selectedShotData ? shotOutcomeName[selectedShotData.outcome] : 'N/A'} | xG:{' '}
              {selectedShotData?.xg.toFixed(2) ?? 'N/A'}
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
    getColor: (shot) => (shot.team?.id === 'arg' ? '#75AADB' : '#002654'),
  },
};

/**
 * Dark theme — the half-pitch shot map on the near-black Match Centre surface
 * (no green grass, white lines).
 */
export const Dark: Story = {
  args: {
    shots: argentinaShots,
    theme: 'dark',
    minSize: 1,
    maxSize: 4,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '500px', background: '#0d0d0d', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * "Shots - Both Teams" — the BTL Match Centre Stats layout. Full pitch, dark
 * theme, each team coloured by kit and attacking opposite goals. Goals are
 * filled discs, other shots are hollow rings.
 */
export const BothTeams: Story = {
  args: {
    shots: allShots,
    variant: 'full',
    theme: 'dark',
    homeTeamId: argentinaTeam.id,
    awayTeamId: franceTeam.id,
    homeColor: '#eb0000',
    awayColor: '#0091eb',
    minSize: 1.5,
    maxSize: 2,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '640px', background: '#0d0d0d', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
  // Behavioural test: in both-teams full-pitch mode each team is coloured by
  // kit, the away side is mirrored to attack the opposite goal, and goals are
  // filled while other shots are hollow rings.
  play: async ({ args, canvasElement }) => {
    const HOME = args.homeColor as string; // '#eb0000'
    const AWAY = args.awayColor as string; // '#0091eb'
    const svg = canvasElement.querySelector('svg');
    assert(svg !== null, 'pitch svg rendered');
    // getAttribute returns the literal attribute string we set, so compare to
    // the hex args directly (not a normalised rgb() form).
    const circles = Array.from(svg.querySelectorAll('circle'));
    const home = circles.filter((c) => c.getAttribute('stroke') === HOME);
    const away = circles.filter((c) => c.getAttribute('stroke') === AWAY);

    // Both kits are represented (4 Argentina + 4 France shots in the fixture).
    assert(home.length === 4, `expected 4 home markers, got ${home.length}`);
    assert(away.length === 4, `expected 4 away markers, got ${away.length}`);

    const cx = (c: Element) => Number(c.getAttribute('cx'));
    // Home attacks the right goal; raw fixture coords stay put (cx > 50).
    assert(
      home.every((c) => cx(c) > 50),
      'home markers attack the right goal (cx > 50)'
    );
    // Away is mirrored to attack the left goal (cx < 50).
    assert(
      away.every((c) => cx(c) < 50),
      'away markers mirrored to the left goal (cx < 50)'
    );

    // Goals are filled discs; non-goal shots are hollow (transparent fill).
    const filled = circles.filter((c) => {
      const fill = c.getAttribute('fill');
      return fill === HOME || fill === AWAY;
    });
    const hollow = circles.filter((c) => c.getAttribute('fill') === 'transparent');
    // Fixture has 6 goals (3 ARG + 3 FRA) and 2 non-goal shots (1 saved, 1 blocked).
    assert(filled.length === 6, `expected 6 filled goals, got ${filled.length}`);
    assert(hollow.length === 2, `expected 2 hollow shots, got ${hollow.length}`);
  },
};

/**
 * Both-teams mode falling back to the default team tokens when no explicit kit
 * colours are supplied.
 */
export const BothTeamsTokenColors: Story = {
  args: {
    shots: allShots,
    variant: 'full',
    theme: 'dark',
    homeTeamId: argentinaTeam.id,
    awayTeamId: franceTeam.id,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '640px', background: '#0d0d0d', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
};
