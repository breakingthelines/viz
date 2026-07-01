import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { HeatMap } from '#/football/blocks/heat-map';
import type { HeatMapPlayer, HeatMapTouch } from '#/football/blocks/heat-map';
import { expectCanvasVisibleOnFirstFrame, withReducedMotion } from '#/test/entrance-lock';

const meta = {
  title: 'Football/Blocks/HeatMap',
  component: HeatMap,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'btl-dark' },
  },
  // Dark editorial page wrapper, mirroring the BTL reader surface.
  decorators: [
    (Story) => (
      <div style={{ background: '#0a0a0a', padding: 48 }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof HeatMap>;

export default meta;
type Story = StoryObj<typeof meta>;

/* -------------------------------------------------------------------------- */
/*  Mock data — a possession side (Spain-at-WC2022 shape).                    */
/*  StatsBomb coords: x 0..120 (own → opp goal), y 0..80 (left → right).      */
/*  Deterministic so the bloom looks identical every render.                  */
/* -------------------------------------------------------------------------- */

// Tiny seeded PRNG (mulberry32) — no network, no randomness drift.
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(20221127);

/** Box–Muller normal sample, clamped to the pitch. */
function blob(
  count: number,
  mx: number,
  my: number,
  sx: number,
  sy: number,
  player: string
): HeatMapTouch[] {
  const out: HeatMapTouch[] = [];
  for (let i = 0; i < count; i++) {
    const u1 = Math.max(rng(), 1e-6);
    const u2 = rng();
    const mag = Math.sqrt(-2 * Math.log(u1));
    const x = mx + sx * mag * Math.cos(2 * Math.PI * u2);
    const y = my + sy * mag * Math.sin(2 * Math.PI * u2);
    out.push({
      x: Math.min(119, Math.max(1, x)),
      y: Math.min(79, Math.max(1, y)),
      player,
    });
  }
  return out;
}

// Single-team Spain XI (no team tag) — proves the original flat-list,
// show-everything behaviour still holds for legacy data.
const SPAIN_PLAYERS: HeatMapPlayer[] = [
  { id: 'busquets', name: 'Busquets' },
  { id: 'pedri', name: 'Pedri' },
  { id: 'gavi', name: 'Gavi' },
  { id: 'olmo', name: 'Olmo' },
  { id: 'azpi', name: 'Azpilicueta' },
];

const SPAIN_TOUCHES: HeatMapTouch[] = [
  ...blob(78, 52, 40, 13, 11, 'busquets'),
  ...blob(70, 66, 27, 14, 12, 'pedri'),
  ...blob(66, 64, 54, 13, 12, 'gavi'),
  ...blob(58, 82, 70, 16, 8, 'olmo'),
  ...blob(54, 74, 12, 18, 8, 'azpi'),
];

// Two-team match: Argentina (this panel's side) + France, each player tagged
// with its team so the selector splits the list. The whole-team default still
// blooms only Argentina's touches; France players are there to drill into.
const ARG_PLAYERS: HeatMapPlayer[] = [
  { id: 'arg-fernandez', name: 'Fernández', team: 'Argentina' },
  { id: 'arg-depaul', name: 'De Paul', team: 'Argentina' },
  { id: 'arg-messi', name: 'Messi', team: 'Argentina' },
  { id: 'arg-molina', name: 'Molina', team: 'Argentina' },
];
const FRA_PLAYERS: HeatMapPlayer[] = [
  { id: 'fra-mbappe', name: 'Mbappé', team: 'France' },
  { id: 'fra-griezmann', name: 'Griezmann', team: 'France' },
  { id: 'fra-tchouameni', name: 'Tchouaméni', team: 'France' },
];
const MATCH_PLAYERS: HeatMapPlayer[] = [...ARG_PLAYERS, ...FRA_PLAYERS];

const MATCH_TOUCHES: HeatMapTouch[] = [
  ...blob(74, 50, 40, 13, 11, 'arg-fernandez'),
  ...blob(68, 64, 30, 14, 12, 'arg-depaul'),
  ...blob(62, 74, 60, 14, 12, 'arg-messi'),
  ...blob(56, 70, 74, 16, 8, 'arg-molina'),
  // France touches sit in their own (mirrored) territory; only shown on drill-in.
  ...blob(60, 70, 24, 15, 11, 'fra-mbappe'),
  ...blob(64, 52, 44, 14, 12, 'fra-griezmann'),
  ...blob(66, 44, 56, 13, 12, 'fra-tchouameni'),
];

// Wikimedia national flags, used as team crests.
const FLAG_SPAIN = 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Spain.svg';
const FLAG_ITALY = 'https://upload.wikimedia.org/wikipedia/commons/0/03/Flag_of_Italy.svg';
const FLAG_ARGENTINA = 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag_of_Argentina.svg';
const FLAG_FRANCE = 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg';

/** True when an SVG `<image>` or HTML `<img>` with this exact href/src is present. */
function hasCrest(root: HTMLElement, url: string): boolean {
  const imgs = [...root.querySelectorAll('img')].some((el) => el.getAttribute('src') === url);
  const svgImgs = [...root.querySelectorAll('image')].some(
    (el) => el.getAttribute('href') === url || el.getAttributeNS(null, 'href') === url
  );
  return imgs || svgImgs;
}

export const Default: Story = {
  args: {
    team: 'Spain',
    crestUrl: FLAG_SPAIN,
    color: '#eb0000',
    touches: SPAIN_TOUCHES,
    players: SPAIN_PLAYERS,
  },
};

/** No named players — an unfiltered team cloud (the filter row is hidden). */
export const NoFilter: Story = {
  args: {
    team: 'Spain',
    crestUrl: FLAG_SPAIN,
    color: '#eb0000',
    touches: SPAIN_TOUCHES,
  },
};

/** A different accent: a possession side rendered in deep blue. */
export const BlueAccent: Story = {
  args: {
    team: 'Italy',
    crestUrl: FLAG_ITALY,
    color: '#3b6fe0',
    touches: SPAIN_TOUCHES,
    players: SPAIN_PLAYERS,
  },
};

/**
 * Both teams supplied: the selector splits players into Argentina / France and
 * the whole-team default blooms only Argentina's touches.
 */
export const BothTeams: Story = {
  args: {
    team: 'Argentina',
    crestUrl: FLAG_ARGENTINA,
    awayCrestUrl: FLAG_FRANCE,
    color: '#6db4ff',
    touches: MATCH_TOUCHES,
    players: MATCH_PLAYERS,
  },
};

/**
 * Exercises the selector on a two-team match: the whole-team default scopes to
 * Argentina's touches, the dropdown shows both team groups (EACH with its own
 * "Whole team" row — the top-level bare row drops once team-aware mode is
 * active, per the shared `PlayerSelect` rule), and selecting a France player
 * narrows the bloom to just that player.
 */
export const WholeTeamDefaultThenSelect: Story = {
  args: { ...BothTeams.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Whole-team default scopes to Argentina only (4 ARG players' touches), NOT
    // every supplied touch — so the count is below the full set.
    const total = MATCH_TOUCHES.length;
    const argTotal = MATCH_TOUCHES.filter((t) => (t.player ?? '').startsWith('arg-')).length;
    const countCell = canvas.getByText(String(argTotal));
    await expect(countCell).toBeInTheDocument();
    await expect(argTotal).toBeLessThan(total);

    // Open the dropdown: EACH team group carries its own "Whole team" row
    // (disambiguated for assistive tech via a qualified accessible name), not a
    // single generic top-level row.
    await userEvent.click(canvas.getByRole('button', { name: /Player/i }));
    const listbox = await canvas.findByRole('listbox');
    const list = within(listbox);
    await expect(list.getByRole('option', { name: 'Argentina — whole team' })).toBeInTheDocument();
    await expect(list.getByRole('option', { name: 'France — whole team' })).toBeInTheDocument();
    await expect(list.getByText('Argentina')).toBeInTheDocument();
    await expect(list.getByText('France')).toBeInTheDocument();

    // Select a France player → the bloom narrows to that player's touches.
    await userEvent.click(list.getByRole('option', { name: 'Mbappé' }));
    const mbappeTouches = MATCH_TOUCHES.filter((t) => t.player === 'fra-mbappe').length;
    await expect(canvas.getByText(String(mbappeTouches))).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /Mbappé/ })).toBeInTheDocument();
  },
};

/**
 * Team-aware selector (the headline fix, mirroring Pass Network's #30/#32/#41
 * treatment). Heat Map was the one football block that never opted into the
 * shared `PlayerSelect` team-aware mode — its dropdown showed a single generic
 * "Whole team" row instead of a per-team eyebrow + "Whole team" row for EACH
 * side, and its footer crest/label stayed hard-wired to the home team even
 * after drilling into the away side. Asserts, on the two-team fixture:
 *   • the dropdown groups players under an "Argentina" and a "France" eyebrow,
 *     each with its OWN qualified "Whole team" row;
 *   • picking "France — whole team" blooms France's touches (not Argentina's),
 *     and the footer crest + label switch to France's flag + name;
 *   • the home (Argentina) crest is gone once France is active — never the
 *     wrong badge.
 */
export const TeamAwareSelectorFollowsActiveSide: Story = {
  args: { ...BothTeams.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Default = Argentina: the footer wears the home crest only.
    await waitFor(() => expect(hasCrest(canvasElement, FLAG_ARGENTINA)).toBe(true));
    await expect(hasCrest(canvasElement, FLAG_FRANCE)).toBe(false);
    await expect(canvas.getByText('Argentina')).toBeInTheDocument();

    // Open the dropdown: a per-team eyebrow + qualified "Whole team" row for
    // EACH side — the primary ask.
    await userEvent.click(canvas.getByRole('button', { name: /Player/i }));
    const listbox = await canvas.findByRole('listbox');
    const list = within(listbox);
    await expect(list.getByRole('option', { name: 'Argentina — whole team' })).toBeInTheDocument();
    await expect(list.getByRole('option', { name: 'France — whole team' })).toBeInTheDocument();

    // Switch to France's whole team → the bloom, crest AND label all follow.
    await userEvent.click(list.getByRole('option', { name: 'France — whole team' }));
    await waitFor(() => expect(canvas.queryByRole('listbox')).not.toBeInTheDocument());

    const franceTotal = MATCH_TOUCHES.filter((t) => (t.player ?? '').startsWith('fra-')).length;
    await waitFor(() => expect(canvas.getByText(String(franceTotal))).toBeInTheDocument());
    await expect(canvas.getByRole('button', { name: /France — whole team/ })).toBeInTheDocument();
    await waitFor(() => expect(hasCrest(canvasElement, FLAG_FRANCE)).toBe(true));
    await expect(hasCrest(canvasElement, FLAG_ARGENTINA)).toBe(false);
    await expect(canvas.getAllByText('France').length).toBeGreaterThan(0);

    // Drilling into a France player also switches the footer to France; the
    // home (Argentina) crest must never reappear.
    await userEvent.click(canvas.getByRole('button', { name: /Player/i }));
    const listbox2 = await canvas.findByRole('listbox');
    await userEvent.click(within(listbox2).getByRole('option', { name: 'Griezmann' }));
    await waitFor(() => expect(canvas.queryByRole('listbox')).not.toBeInTheDocument());
    const griezmannTouches = MATCH_TOUCHES.filter((t) => t.player === 'fra-griezmann').length;
    await waitFor(() => expect(canvas.getByText(String(griezmannTouches))).toBeInTheDocument());
    await expect(hasCrest(canvasElement, FLAG_ARGENTINA)).toBe(false);
    await expect(hasCrest(canvasElement, FLAG_FRANCE)).toBe(true);
  },
};

/**
 * Persisted selection — seeding. A host (the editor) passes `initialSelection`
 * to open the block on an author's saved player rather than the whole-team
 * default. Here it opens already filtered to a France player: the trigger shows
 * that player and the bloom is narrowed to their touches on first paint.
 */
export const SeededSelection: Story = {
  args: {
    ...BothTeams.args,
    initialSelection: { activePlayer: 'fra-mbappe', selectedTeam: null },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Opens on the seeded player (no interaction): trigger + narrowed count.
    await expect(canvas.getByRole('button', { name: /Mbappé/ })).toBeInTheDocument();
    const mbappeTouches = MATCH_TOUCHES.filter((t) => t.player === 'fra-mbappe').length;
    await expect(canvas.getByText(String(mbappeTouches))).toBeInTheDocument();
  },
};

/**
 * Persisted selection — change emission. `onSelectionChange` fires with the FULL
 * new selection object (player + side) whenever the user changes the filter, so
 * the host can persist it. Unseeded (whole-team default); selecting a player
 * emits `{ activePlayer, selectedTeam }` with the active side still `null` (the
 * team-switch is derived from the player's own data, mirroring Pass Network).
 */
export const EmitsSelectionChange: Story = {
  args: {
    ...BothTeams.args,
    onSelectionChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Player/i }));
    const listbox = await canvas.findByRole('listbox');
    await userEvent.click(within(listbox).getByRole('option', { name: 'Mbappé' }));
    await expect(args.onSelectionChange).toHaveBeenCalledWith({
      activePlayer: 'fra-mbappe',
      selectedTeam: null,
    });
  },
};

/**
 * Entrance-blank lock (viz #28). The heat canvas IS the whole visualisation, and
 * it lived inside `<AnimatePresence>` with `initial={{ opacity: 0 }}`, so a
 * dropped mount/hydration tick (the parent also REMOUNTS it on every filter
 * change via a keyed remount) left the entire map blank. This renders with all
 * framer-motion animation disabled and asserts the canvas is opaque on the first
 * frame — without the entrance fade firing. Locked: the canvas uses
 * `initial={false}`.
 */
export const EntranceLock: Story = {
  args: { ...Default.args },
  decorators: [withReducedMotion],
  play: async ({ canvasElement }) => {
    await expectCanvasVisibleOnFirstFrame(canvasElement);
  },
};
