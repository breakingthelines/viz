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

// Same idea, but also holds `selectedTeam` and wires `onSelectTeam` — the two
// extra pieces of state that switch PlayerSelect into team-aware mode (each
// team group gains its own "Whole team" row). Mirrors how the team-aware
// blocks (Pass Sonar, Pass Network, Line-breaking, Progression) drive it.
function TeamAwarePlayerSelectHarness({ players }: { players: SelectablePlayer[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  return (
    <PlayerSelect
      players={players}
      selectedId={selectedId}
      onSelect={setSelectedId}
      selectedTeam={selectedTeam}
      onSelectTeam={setSelectedTeam}
    />
  );
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

/**
 * Team-aware (grouped) mode: `selectedTeam` + `onSelectTeam` wired, so each
 * team group gains its OWN "Whole team" row rather than a single top-level
 * default. Locks the de-duplication fix: no separate top-level bare option
 * exists (the home team's own row already covers that default state), each
 * team group's row is reachable by its qualified accessible name even though
 * both show the same bare "Whole team" text, and picking the away team's row
 * switches the active side.
 */
export const TeamAwareGrouped: Story = {
  args: { players: ARG_FRA },
  render: (args) => <TeamAwarePlayerSelectHarness players={args.players} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Player/i }));
    const listbox = await canvas.findByRole('listbox');
    const list = within(listbox);

    // No separate top-level bare "Whole team" option — only the per-team rows,
    // which happen to share that same bare visible text. `getByRole` with an
    // unqualified name would be ambiguous (two matches) if a third, top-level
    // row existed; asserting exactly two "Whole team"-ish rows locks that no
    // extra row is present.
    await expect(list.getAllByText('Whole team')).toHaveLength(2);

    // Each team's row resolves individually via its qualified accessible name.
    const argentinaRow = list.getByRole('option', { name: 'Argentina — whole team' });
    const franceRow = list.getByRole('option', { name: 'France — whole team' });
    await expect(argentinaRow).toBeInTheDocument();
    await expect(franceRow).toBeInTheDocument();
    // Both rows still show the bare visible label, not the qualified one.
    await expect(argentinaRow).toHaveTextContent('Whole team');
    await expect(franceRow).toHaveTextContent('Whole team');

    // Default seed state {selectedId:null, selectedTeam:null}: neither row's
    // OWN `selectedTeam === team` check is true yet, so neither shows checked —
    // matching every team-aware block's actual initial `selectedTeam` of `null`.
    await expect(argentinaRow).toHaveAttribute('aria-selected', 'false');
    await expect(franceRow).toHaveAttribute('aria-selected', 'false');
    // The trigger reads the plain default label, not either qualified form.
    await expect(canvas.getByRole('button', { name: /Player/i })).toHaveTextContent('Whole team');

    // Picking the away team's row switches the active side: the trigger now
    // reads the qualified France label, and re-opening shows France's row as
    // the selected one instead.
    await userEvent.click(franceRow);
    await expect(canvas.getByText('France — whole team')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: /Player/i }));
    const listbox2 = await canvas.findByRole('listbox');
    const list2 = within(listbox2);
    await expect(list2.getByRole('option', { name: 'France — whole team' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(list2.getByRole('option', { name: 'Argentina — whole team' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  },
};
