import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { PassNetwork } from '#/football/blocks/pass-network';
import type { PassNetworkLink, PassNetworkPlayer } from '#/football/blocks/pass-network';
import { collectBadCirclesDuring } from '#/test/console-spy';

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

// Two nodes stacked almost on top of each other (the Acuña / Di María clash):
// same column, a hair apart in y. Their surnames would print over one another
// unless one label flips to the opposite side.
const STACKED_PLAYERS: PassNetworkPlayer[] = [
  { id: 'gk', name: 'Emiliano Martínez', x: 10, y: 40, involvement: 38 },
  { id: 'lb', name: 'Marcos Acuña', x: 86, y: 18, involvement: 49 },
  { id: 'lw', name: 'Ángel Di María', x: 92, y: 22, involvement: 58 },
  { id: 'st', name: 'Lionel Messi', x: 92, y: 50, involvement: 84 },
];
const STACKED_LINKS: PassNetworkLink[] = [
  { from: 'gk', to: 'lb', count: 8 },
  { from: 'lb', to: 'lw', count: 18 },
  { from: 'lw', to: 'st', count: 22 },
];

/**
 * Label-collision lock (viz #27, item 2): when two nodes stack in the same
 * column, their surnames must not render at the same y — one flips to the
 * opposite side of its disc. Asserts the two contested names sit on opposite
 * sides (one above its centre, one below).
 */
export const StackedLabelsDoNotCollide: Story = {
  args: {
    team: 'Argentina',
    crestUrl: FLAG_ARGENTINA,
    players: STACKED_PLAYERS,
    links: STACKED_LINKS,
  },
  play: async ({ canvasElement }) => {
    const acuna = await within(canvasElement).findByText('Acuña');
    // "Di María" — the particle "Di" is part of the surname.
    const diMaria = await within(canvasElement).findByText('Di María');
    // Resolve each label's disc centre (the node's headshot <image> or monogram
    // <circle>) and compare to the label's own y: above-centre vs below-centre.
    const sideOf = (label: Element): 'above' | 'below' => {
      const group = label.closest('g')!;
      const circ = group.querySelector('circle');
      const img = group.querySelector('image');
      const cy =
        circ != null
          ? Number.parseFloat(circ.getAttribute('cy')!)
          : // <image> has no cy — derive from y + height/2.
            Number.parseFloat(img!.getAttribute('y')!) +
            Number.parseFloat(img!.getAttribute('height')!) / 2;
      return Number.parseFloat(label.getAttribute('y')!) < cy ? 'above' : 'below';
    };
    // The two stacked names end up on opposite sides — they never share a y.
    expect(sideOf(acuna)).not.toBe(sideOf(diMaria));
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

// Substitutes' passes go to STARTERS, never to each other (the realistic case
// that made a sub-to-sub-only Subs view read empty). The Subs scope shows these.
const ARG_SUB_LINKS: PassNetworkLink[] = [
  { from: 'sub-paredes', to: 'st', count: 9 }, // Paredes → Messi
  { from: 'sub-paredes', to: 'rcm', count: 7 }, // Paredes → De Paul
  { from: 'rcb', to: 'sub-montiel', count: 6 }, // Romero → Montiel (received)
];
const FRA_SUB_LINKS: PassNetworkLink[] = [
  { from: 'fr-thuram', to: 'fr-mbappe', count: 5 }, // Thuram → Mbappé
];

const MATCH_PLAYERS: PassNetworkPlayer[] = [...ARG_STARTERS, ...ARG_SUBS, ...FRA_PLAYERS];
const MATCH_LINKS: PassNetworkLink[] = [
  ...ARGENTINA_LINKS,
  ...FRA_LINKS,
  ...ARG_SUB_LINKS,
  ...FRA_SUB_LINKS,
];

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

    // Flip to Subs → the sub appears. Tagliafico (a starter the subs never passed
    // to) drops away; Messi stays because a sub fed him (Subs shows the subs'
    // passes to anyone — see SubsShowPassesToAnyone).
    await userEvent.click(canvas.getByRole('button', { name: 'Subs' }));
    await waitFor(() => expect(canvas.getByText('Montiel')).toBeInTheDocument());
    await expect(canvas.queryByText('Tagliafico')).not.toBeInTheDocument();

    // Back to Starters, then open the dropdown — both team groups are present.
    await userEvent.click(canvas.getByRole('button', { name: 'Starters' }));
    await userEvent.click(canvas.getByRole('button', { name: /Player/i }));
    const listbox = await canvas.findByRole('listbox');
    const list = within(listbox);
    await expect(list.getByRole('option', { name: 'Whole team' })).toBeInTheDocument();
    await expect(list.getByText('Argentina')).toBeInTheDocument();
    await expect(list.getByText('France')).toBeInTheDocument();
    // Subs are selectable in the dropdown too, grouped under their team — the
    // selector lists every player (starters AND subs), not just the active scope.
    await expect(list.getByRole('option', { name: 'Leandro Paredes' })).toBeInTheDocument();
    await expect(list.getByRole('option', { name: 'Marcus Thuram' })).toBeInTheDocument();
  },
};

/**
 * Subs-to-anyone lock (review #3, item 3). A substitute-only graph is almost
 * always near-empty — subs rarely pass to each other — so the Subs scope must
 * show each sub's passes to ANYONE (their involvement across the side), not
 * sub-to-sub only. With the data, the subs (Paredes, Montiel) only ever connect
 * to STARTERS (Messi, De Paul, Romero), so a sub-to-sub graph would have zero
 * edges. This flips to Subs and asserts: the sub shows, the starter it fed
 * (Messi) is pulled in as a pass partner, an unrelated starter (Tagliafico) is
 * NOT, and at least one edge is actually drawn — i.e. the subs' web populates.
 */
export const SubsShowPassesToAnyone: Story = {
  args: { ...BothTeamsWithSubs.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText('Messi')).toBeInTheDocument());

    await userEvent.click(canvas.getByRole('button', { name: 'Subs' }));

    // The sub shows, and the starter it passed to is pulled in as a partner.
    await waitFor(() => expect(canvas.getByText('Paredes')).toBeInTheDocument());
    await expect(canvas.getByText('Messi')).toBeInTheDocument(); // Paredes → Messi
    await expect(canvas.getByText('De Paul')).toBeInTheDocument(); // Paredes → De Paul
    // A starter no sub connected to is NOT shown — Subs is the subs' web, not the
    // whole XI reappearing.
    await expect(canvas.queryByText('Tagliafico')).not.toBeInTheDocument();

    // The subs' passes are actually DRAWN — at least one edge (a non-transparent
    // <line>) exists in the pitch, so the Subs view isn't the old empty graph.
    const drawnEdges = [...canvasElement.querySelectorAll('svg line')].filter(
      (l) => l.getAttribute('stroke') !== 'transparent'
    );
    expect(drawnEdges.length).toBeGreaterThan(0);
  },
};

/**
 * Regression lock for the transient `<circle r="undefined">` warning (viz #27,
 * item 7). Swapping the selected player re-keys the animated nodes as the
 * filtered set changes; a `motion.circle` whose `r` is read mid-transition must
 * always resolve to a finite, positive number. React DROPS an `r` that resolves
 * to `undefined` (rendering `r=null`) and warns in a dev build — that warning is
 * suppressed in the vitest browser build, so this lock instead polls the DOM
 * every animation frame across the swap and asserts no `<circle>` ever loses a
 * finite `r` (see {@link collectBadCirclesDuring}).
 */
export const SelectorSwapNoCircleWarning: Story = {
  args: { ...BothTeamsWithSubs.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const openAndPick = async (name: string) => {
      await userEvent.click(canvas.getByRole('button', { name: /Player/i }));
      const listbox = await canvas.findByRole('listbox');
      await userEvent.click(within(listbox).getByRole('option', { name }));
    };

    await waitFor(() => expect(canvas.getByText('Messi')).toBeInTheDocument());

    // Hover a node so its halo motion.circle is mounted, then swap the selection
    // out from under it while polling every frame — the realistic "hover a
    // player, then change the selector" path that re-keys the node set and runs
    // node + halo enter/exit transitions.
    const bad = await collectBadCirclesDuring(canvasElement, async () => {
      await userEvent.hover(canvas.getByLabelText(/Lionel Messi, involvement/i));
      await openAndPick('Lionel Messi');
      await waitFor(() => expect(canvas.getByText('Messi')).toBeInTheDocument());
      await openAndPick('Rodrigo De Paul');
      await waitFor(() => expect(canvas.getByText('De Paul')).toBeInTheDocument());
      await openAndPick('Kylian Mbappé');
      await openAndPick('Whole team');
      await waitFor(() => expect(canvas.getByText('Messi')).toBeInTheDocument());
    });

    expect(bad).toEqual([]);
  },
};
