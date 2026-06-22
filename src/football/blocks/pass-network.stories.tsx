import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { PassNetwork } from '#/football/blocks/pass-network';
import type { PassNetworkLink, PassNetworkPlayer } from '#/football/blocks/pass-network';

/**
 * Argentina's average positions / pass volumes, WC2022 final-ish shape
 * (3-/4-band build-up). StatsBomb coords: x 0–120 (low = own goal),
 * y 0–80 (0 = left touchline). The defence sits deep-left, the front three
 * high-right, with Mac Allister / De Paul / Fernández as the midfield pivot.
 *
 * A few nodes carry an `imageUrl` (rendered as a circular headshot); the rest
 * are left photo-less to show the monogram fallback.
 */
const ARGENTINA_PLAYERS: PassNetworkPlayer[] = [
  { id: 'gk', name: 'Emiliano Martínez', x: 10, y: 40, involvement: 38 },
  { id: 'rb', name: 'Nahuel Molina', x: 42, y: 70, involvement: 52 },
  { id: 'rcb', name: 'Cristian Romero', x: 30, y: 52, involvement: 61 },
  {
    id: 'lcb',
    name: 'Nicolás Otamendi',
    x: 30,
    y: 28,
    involvement: 64,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Nicol%C3%A1s_Otamendi_2018.jpg',
  },
  { id: 'lb', name: 'Nicolás Tagliafico', x: 44, y: 12, involvement: 49 },
  {
    id: 'rcm',
    name: 'Rodrigo De Paul',
    x: 62,
    y: 56,
    involvement: 78,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/6/6d/Rodrigo_De_Paul_2018_%28cropped%29.jpg',
  },
  {
    id: 'cm',
    name: 'Enzo Fernández',
    x: 58,
    y: 38,
    involvement: 71,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Enzo_Fern%C3%A1ndez_2022.jpg',
  },
  { id: 'lcm', name: 'Alexis Mac Allister', x: 66, y: 22, involvement: 67 },
  {
    id: 'rw',
    name: 'Ángel Di María',
    x: 88,
    y: 18,
    involvement: 58,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Angel_Di_Maria_2018.jpg',
  },
  {
    id: 'st',
    name: 'Lionel Messi',
    x: 92,
    y: 48,
    involvement: 84,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Lionel_Messi_20180626.jpg',
  },
  { id: 'lw', name: 'Julián Álvarez', x: 96, y: 66, involvement: 46 },
];

const ARGENTINA_LINKS: PassNetworkLink[] = [
  // Back line + keeper circulation
  { from: 'gk', to: 'lcb', count: 14 },
  { from: 'gk', to: 'rcb', count: 12 },
  { from: 'rcb', to: 'lcb', count: 22 },
  { from: 'lcb', to: 'lb', count: 19 },
  { from: 'rcb', to: 'rb', count: 21 },
  { from: 'lcb', to: 'cm', count: 17 },
  { from: 'rcb', to: 'rcm', count: 18 },
  // Full-backs ↔ midfield (heavier — the wide build-up)
  { from: 'rb', to: 'rcm', count: 27 },
  { from: 'lb', to: 'lcm', count: 25 },
  { from: 'rb', to: 'rw', count: 16 },
  { from: 'lb', to: 'lw', count: 13 },
  // Midfield triangle (heaviest)
  { from: 'rcm', to: 'cm', count: 31 },
  { from: 'cm', to: 'lcm', count: 29 },
  { from: 'rcm', to: 'lcm', count: 18 },
  { from: 'cm', to: 'rcb', count: 15 },
  // Midfield → front
  { from: 'rcm', to: 'st', count: 24 },
  { from: 'lcm', to: 'st', count: 22 },
  { from: 'cm', to: 'st', count: 20 },
  { from: 'lcm', to: 'rw', count: 17 },
  { from: 'rcm', to: 'rw', count: 14 },
  // Front three interplay
  { from: 'st', to: 'rw', count: 23 },
  { from: 'st', to: 'lw', count: 19 },
  { from: 'rw', to: 'lw', count: 11 },
  { from: 'st', to: 'lcm', count: 18 },
  { from: 'lw', to: 'rb', count: 9 },
];

const meta = {
  title: 'Football/Blocks/PassNetwork',
  component: PassNetwork,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'btl-dark' },
  },
  decorators: [
    (Story) => (
      <div
        style={{ backgroundColor: '#0a0a0a' }}
        className="flex min-h-screen items-center justify-center p-10"
      >
        <div className="w-full max-w-[760px]">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof PassNetwork>;

export default meta;

type Story = StoryObj<typeof meta>;

// Wikimedia national flag, used as the team crest.
const FLAG_ARGENTINA = 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag_of_Argentina.svg';

export const Argentina: Story = {
  args: {
    team: 'Argentina',
    crestUrl: FLAG_ARGENTINA,
    players: ARGENTINA_PLAYERS,
    links: ARGENTINA_LINKS,
  },
};

export const CustomAccent: Story = {
  args: {
    team: 'Argentina',
    crestUrl: FLAG_ARGENTINA,
    color: '#75aadb',
    players: ARGENTINA_PLAYERS,
    links: ARGENTINA_LINKS,
  },
};

// ── Two-team match data (selector split + starters/subs toggle) ──────────────

// Tag the Argentina XI as starters of their team.
const ARG_STARTERS: PassNetworkPlayer[] = ARGENTINA_PLAYERS.map((p) => ({
  ...p,
  team: 'Argentina',
  starter: true,
}));

// A couple of Argentina substitutes — hidden under the default Starters scope.
const ARG_SUBS: PassNetworkPlayer[] = [
  {
    id: 'sub-paredes',
    name: 'Leandro Paredes',
    team: 'Argentina',
    starter: false,
    x: 54,
    y: 46,
    involvement: 18,
  },
  {
    id: 'sub-montiel',
    name: 'Gonzalo Montiel',
    team: 'Argentina',
    starter: false,
    x: 40,
    y: 78,
    involvement: 12,
  },
];

// A few France starters with their own internal links, so the network can be
// scoped to either side and the selector splits the node list by team.
const FRA_PLAYERS: PassNetworkPlayer[] = [
  {
    id: 'fr-tchouameni',
    name: 'Aurélien Tchouaméni',
    team: 'France',
    starter: true,
    x: 44,
    y: 50,
    involvement: 70,
  },
  {
    id: 'fr-griezmann',
    name: 'Antoine Griezmann',
    team: 'France',
    starter: true,
    x: 60,
    y: 46,
    involvement: 66,
  },
  {
    id: 'fr-mbappe',
    name: 'Kylian Mbappé',
    team: 'France',
    starter: true,
    x: 84,
    y: 24,
    involvement: 80,
  },
  {
    id: 'fr-thuram',
    name: 'Marcus Thuram',
    team: 'France',
    starter: false,
    x: 78,
    y: 60,
    involvement: 20,
  },
];

const FRA_LINKS: PassNetworkLink[] = [
  { from: 'fr-tchouameni', to: 'fr-griezmann', count: 24 },
  { from: 'fr-griezmann', to: 'fr-mbappe', count: 28 },
  { from: 'fr-tchouameni', to: 'fr-mbappe', count: 14 },
];

const MATCH_PLAYERS: PassNetworkPlayer[] = [...ARG_STARTERS, ...ARG_SUBS, ...FRA_PLAYERS];
const MATCH_LINKS: PassNetworkLink[] = [...ARGENTINA_LINKS, ...FRA_LINKS];

/**
 * Both teams supplied with starter flags: the whole-team default shows
 * Argentina's starting XI; the selector splits nodes into Argentina / France,
 * a Starters / Subs toggle switches the team-level set, and selecting a player
 * drives a persistent ego-highlight.
 */
export const BothTeamsWithSubs: Story = {
  args: {
    team: 'Argentina',
    crestUrl: FLAG_ARGENTINA,
    players: MATCH_PLAYERS,
    links: MATCH_LINKS,
  },
};

/** Exercises the selector grouping + the Starters / Subs toggle. */
export const StartersSubsAndSelect: Story = {
  args: { ...BothTeamsWithSubs.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Default scope = Starters: a starter (Messi) shows, a sub (Montiel) doesn't.
    await waitFor(() => expect(canvas.getByText('Messi')).toBeInTheDocument());
    await expect(canvas.queryByText('Montiel')).not.toBeInTheDocument();

    // Flip to Subs → the sub appears and the starters drop away.
    await userEvent.click(canvas.getByRole('button', { name: 'Subs' }));
    await waitFor(() => expect(canvas.getByText('Montiel')).toBeInTheDocument());
    await expect(canvas.queryByText('Messi')).not.toBeInTheDocument();

    // Back to Starters, then open the dropdown — both team groups are present.
    await userEvent.click(canvas.getByRole('button', { name: 'Starters' }));
    await userEvent.click(canvas.getByRole('button', { name: /Player/i }));
    const listbox = await canvas.findByRole('listbox');
    const list = within(listbox);
    await expect(list.getByRole('option', { name: 'Whole team' })).toBeInTheDocument();
    await expect(list.getByText('Argentina')).toBeInTheDocument();
    await expect(list.getByText('France')).toBeInTheDocument();
  },
};
