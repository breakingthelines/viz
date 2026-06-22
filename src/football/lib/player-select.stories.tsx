import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { useState } from 'react';
import { PlayerSelect, type SelectablePlayer } from '#/football/lib/player-select';

// A tiny stateful host: PlayerSelect is presentational (the owning block holds
// the selected id), so the stories drive it through real state like a block does.
function PlayerSelectHarness({ players }: { players: SelectablePlayer[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return <PlayerSelect players={players} selectedId={selectedId} onSelect={setSelectedId} />;
}

const meta = {
  title: 'Football/Lib/PlayerSelect',
  component: PlayerSelectHarness,
  parameters: { layout: 'centered', backgrounds: { default: 'btl-dark' } },
  decorators: [
    (Story) => (
      <div style={{ background: '#0a0a0a', padding: 64, minWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PlayerSelectHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

const ARG_FRA: SelectablePlayer[] = [
  { id: 'a1', name: 'Lionel Messi', team: 'Argentina' },
  { id: 'a2', name: 'Julián Álvarez', team: 'Argentina' },
  { id: 'f1', name: 'Kylian Mbappé', team: 'France' },
  { id: 'f2', name: 'Antoine Griezmann', team: 'France' },
];

/**
 * Two teams supplied → the list splits into Argentina / France group headings.
 * This is the shared grouping every drill-down card (Heat Map, Line-Breaking,
 * Pass Sonar, Pass Network, Progression) relies on.
 */
export const GroupedByTeam: Story = {
  args: { players: ARG_FRA },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Player/i }));
    const listbox = await canvas.findByRole('listbox');
    const list = within(listbox);
    await expect(list.getByText('Argentina')).toBeInTheDocument();
    await expect(list.getByText('France')).toBeInTheDocument();
    // All four players + the "Whole team" default are present.
    for (const name of ['Lionel Messi', 'Julián Álvarez', 'Kylian Mbappé', 'Antoine Griezmann']) {
      await expect(list.getByRole('option', { name })).toBeInTheDocument();
    }
  },
};

/** A single team → a flat list with no headings (the deliberate single-team UX). */
export const SingleTeamFlat: Story = {
  args: { players: ARG_FRA.filter((p) => p.team === 'Argentina') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Player/i }));
    const listbox = await canvas.findByRole('listbox');
    const list = within(listbox);
    await expect(list.queryByText('Argentina')).not.toBeInTheDocument();
    await expect(list.getByRole('option', { name: 'Lionel Messi' })).toBeInTheDocument();
  },
};

/**
 * No-drop lock (viz #28, item 3). When the data mixes team-tagged players with
 * untagged ones, the grouped path used to filter strictly by team — so the
 * untagged players DISAPPEARED from the dropdown entirely (a silent data-loss
 * bug that hid rows). They must now still appear, in a trailing un-headed
 * section, so a card never quietly drops a selectable player.
 */
export const MixedKeepsUntaggedPlayers: Story = {
  args: {
    players: [
      { id: 'a1', name: 'Lionel Messi', team: 'Argentina' },
      { id: 'f1', name: 'Kylian Mbappé', team: 'France' },
      { id: 'x1', name: 'Unteamed One' },
      { id: 'x2', name: 'Unteamed Two' },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Player/i }));
    const listbox = await canvas.findByRole('listbox');
    const list = within(listbox);
    // Grouped (two teams present) AND the untagged players survive.
    await expect(list.getByText('Argentina')).toBeInTheDocument();
    await expect(list.getByText('France')).toBeInTheDocument();
    await expect(list.getByRole('option', { name: 'Unteamed One' })).toBeInTheDocument();
    await expect(list.getByRole('option', { name: 'Unteamed Two' })).toBeInTheDocument();
  },
};
