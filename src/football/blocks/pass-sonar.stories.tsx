import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { PassSonar } from './pass-sonar';
import type { PassSonarPlayer, PassWedge } from './pass-sonar';
import { collectBadCirclesDuring } from '#/test/console-spy';

const meta = {
  title: 'Football/Blocks/PassSonar',
  component: PassSonar,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ background: '#0a0a0a', padding: 48 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof PassSonar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Directional wedge. Angle convention: 0° = toward the opposition goal (forward),
// 90° = right touchline, 180° = backward, 270° = left. avgLength in metres.
const w = (angleDeg: number, avgLength: number, count: number): PassWedge => ({
  angleDeg,
  avgLength,
  count,
});

// Argentina 4-3-3, attacking left → right (x,y on the 0–100 pitch). Tagged with
// the team (for the selector's group heading) and as starters.
const ARGENTINA: PassSonarPlayer[] = [
  {
    id: 'gk',
    name: 'E. Martínez',
    team: 'Argentina',
    starter: true,
    x: 8,
    y: 50,
    wedges: [w(0, 34, 8), w(45, 30, 4), w(315, 30, 4), w(90, 20, 3), w(270, 20, 3), w(180, 8, 1)],
  },
  {
    id: 'rb',
    name: 'Molina',
    team: 'Argentina',
    starter: true,
    x: 32,
    y: 82,
    wedges: [w(0, 18, 9), w(315, 15, 12), w(270, 12, 8), w(225, 10, 5), w(45, 16, 4)],
  },
  {
    id: 'rcb',
    name: 'Romero',
    team: 'Argentina',
    starter: true,
    x: 24,
    y: 62,
    wedges: [w(0, 16, 10), w(315, 14, 14), w(270, 10, 9), w(45, 14, 6), w(180, 9, 3)],
  },
  {
    id: 'lcb',
    name: 'Otamendi',
    team: 'Argentina',
    starter: true,
    x: 24,
    y: 38,
    wedges: [w(0, 16, 10), w(45, 14, 14), w(90, 10, 9), w(315, 14, 6), w(180, 9, 3)],
  },
  {
    id: 'lb',
    name: 'Tagliafico',
    team: 'Argentina',
    starter: true,
    x: 32,
    y: 18,
    wedges: [w(0, 18, 9), w(45, 15, 12), w(90, 12, 8), w(135, 10, 5), w(315, 16, 4)],
  },
  {
    id: 'dm',
    name: 'Fernández',
    team: 'Argentina',
    starter: true,
    x: 44,
    y: 50,
    wedges: [
      w(0, 22, 12),
      w(45, 18, 10),
      w(315, 18, 10),
      w(90, 14, 9),
      w(270, 14, 9),
      w(180, 12, 5),
    ],
  },
  {
    id: 'rcm',
    name: 'De Paul',
    team: 'Argentina',
    starter: true,
    x: 56,
    y: 62,
    wedges: [w(0, 16, 11), w(315, 14, 10), w(270, 12, 9), w(45, 14, 7), w(225, 10, 4)],
  },
  {
    id: 'lcm',
    name: 'Mac Allister',
    team: 'Argentina',
    starter: true,
    x: 56,
    y: 38,
    wedges: [w(0, 16, 11), w(45, 14, 10), w(90, 12, 9), w(315, 14, 7), w(135, 10, 4)],
  },
  {
    id: 'rw',
    name: 'Messi',
    team: 'Argentina',
    starter: true,
    x: 74,
    y: 80,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Lionel_Messi_WC2022.jpg',
    wedges: [w(315, 14, 16), w(0, 12, 9), w(270, 12, 10), w(225, 10, 6), w(180, 8, 4)],
  },
  {
    id: 'lw',
    name: 'Di María',
    team: 'Argentina',
    starter: true,
    x: 74,
    y: 20,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Angel_Di_Maria_2018.jpg',
    wedges: [w(45, 14, 16), w(0, 12, 9), w(90, 12, 10), w(135, 10, 6), w(180, 8, 4)],
  },
  {
    id: 'st',
    name: 'J. Álvarez',
    team: 'Argentina',
    starter: true,
    x: 80,
    y: 50,
    wedges: [w(135, 8, 7), w(225, 8, 7), w(90, 8, 6), w(270, 8, 6), w(0, 8, 4)],
  },
];

// A couple of Argentina substitutes — hidden under the default Starters scope.
const ARGENTINA_SUBS: PassSonarPlayer[] = [
  {
    id: 'sub-paredes',
    name: 'Paredes',
    team: 'Argentina',
    starter: false,
    x: 46,
    y: 44,
    wedges: [w(0, 14, 4), w(45, 12, 3), w(315, 12, 3), w(180, 10, 2)],
  },
  {
    id: 'sub-montiel',
    name: 'Montiel',
    team: 'Argentina',
    starter: false,
    x: 36,
    y: 84,
    wedges: [w(0, 12, 3), w(315, 11, 4), w(270, 9, 2)],
  },
];

// A handful of France players (the other side of the final), so the selector
// splits the list into Argentina / France groups.
const FRANCE: PassSonarPlayer[] = [
  {
    id: 'fr-mbappe',
    name: 'Mbappé',
    team: 'France',
    starter: true,
    x: 72,
    y: 22,
    wedges: [w(45, 16, 12), w(0, 13, 8), w(90, 12, 7), w(135, 9, 4)],
  },
  {
    id: 'fr-griezmann',
    name: 'Griezmann',
    team: 'France',
    starter: true,
    x: 58,
    y: 48,
    wedges: [w(0, 15, 10), w(45, 13, 8), w(315, 13, 8), w(180, 10, 4)],
  },
  {
    id: 'fr-tchouameni',
    name: 'Tchouaméni',
    team: 'France',
    starter: true,
    x: 42,
    y: 52,
    wedges: [w(0, 18, 11), w(45, 15, 9), w(315, 15, 9), w(180, 11, 4)],
  },
  {
    id: 'fr-thuram',
    name: 'Thuram',
    team: 'France',
    starter: false,
    x: 70,
    y: 60,
    wedges: [w(0, 12, 4), w(315, 11, 3), w(45, 11, 3)],
  },
];

// Crests for the team-aware stories. Home = Argentina, away = France. Pinned so
// the focus-card crest assertions can match the exact `<image href>` regardless
// of which players carry headshots.
const ARGENTINA_CREST = 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag_of_Argentina.svg';
const FRANCE_CREST = 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg';

/** True when an SVG `<image>` with this exact href is rendered anywhere. */
function hasImageHref(root: HTMLElement, href: string): boolean {
  return [...root.querySelectorAll('image')].some(
    (img) => img.getAttribute('href') === href || img.getAttributeNS(null, 'href') === href
  );
}

/** Original single-team sonar (now with team/starter tags on the XI). */
export const Argentina: Story = {
  args: {
    team: 'Argentina',
    crestUrl: ARGENTINA_CREST,
    players: ARGENTINA,
  },
};

/**
 * Both teams supplied with starter flags: the whole-team default shows
 * Argentina's starting XI; the selector splits players into Argentina / France
 * and a Starters / Subs toggle switches the team-level set.
 */
export const BothTeamsWithSubs: Story = {
  args: {
    team: 'Argentina',
    crestUrl: ARGENTINA_CREST,
    awayCrestUrl: FRANCE_CREST,
    players: [...ARGENTINA, ...ARGENTINA_SUBS, ...FRANCE],
  },
};

/**
 * Exercises the selector: the dropdown lists a "Whole team" default plus the
 * players split into Argentina / France groups, and a France player can be
 * selected to drill in.
 */
export const SelectsPlayerAcrossTeams: Story = {
  args: { ...BothTeamsWithSubs.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The whole-team default surfaces an Argentina starter label on the pitch.
    await waitFor(() => expect(canvas.getByText('De Paul')).toBeInTheDocument());

    // Open the player dropdown.
    await userEvent.click(canvas.getByRole('button', { name: /Player/i }));
    const listbox = await canvas.findByRole('listbox');
    const list = within(listbox);

    // "Whole team" default is offered, plus both team group headings.
    await expect(list.getByRole('option', { name: 'Whole team' })).toBeInTheDocument();
    await expect(list.getByText('Argentina')).toBeInTheDocument();
    await expect(list.getByText('France')).toBeInTheDocument();

    // Drill into a France player.
    await userEvent.click(list.getByRole('option', { name: 'Mbappé' }));

    // The dropdown closes and the trigger now reads the selected player (and his
    // large focus sonar + name read-out render on the pitch).
    await waitFor(() => expect(canvas.queryByRole('listbox')).not.toBeInTheDocument());
    await expect(canvas.getAllByText('Mbappé').length).toBeGreaterThan(0);
  },
};

/**
 * Per-player focus-card crest is the SELECTED player's OWN side (viz #31 + #34).
 * The block now carries BOTH crests — home (Argentina) AND away (France) — so:
 *   • selecting a HOME player (Messi, Argentina) → the focus card wears the home
 *     (Argentina) crest, never France's;
 *   • selecting an AWAY player (Mbappé, France) → the focus card now wears the
 *     away (France) crest, never the home (Argentina) flag. (Under #31 the block
 *     carried only the home crest, so the away card was name-only; #34 bakes the
 *     away crest, so France's flag shows.)
 * Asserts the crest `<image href>` tracks the picked player's side — the right
 * flag present, the other absent (matching on the crest URL specifically, since
 * headshots also render `<image>` elements).
 */
export const FocusCardCrestFollowsSelectedTeam: Story = {
  args: { ...BothTeamsWithSubs.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const pick = async (name: string) => {
      await userEvent.click(canvas.getByRole('button', { name: /Player/i }));
      const listbox = await canvas.findByRole('listbox');
      await userEvent.click(within(listbox).getByRole('option', { name }));
      await waitFor(() => expect(canvas.queryByRole('listbox')).not.toBeInTheDocument());
    };

    await waitFor(() => expect(canvas.getByText('De Paul')).toBeInTheDocument());

    // HOME player: the focus card surfaces the home (Argentina) crest, not France's.
    await pick('Messi');
    await waitFor(() => expect(canvas.getAllByText('Messi').length).toBeGreaterThan(0));
    await waitFor(() => expect(hasImageHref(canvasElement, ARGENTINA_CREST)).toBe(true));
    await waitFor(() => expect(hasImageHref(canvasElement, FRANCE_CREST)).toBe(false));

    // AWAY player: switching to a France player surfaces FRANCE's crest and drops
    // the home (Argentina) flag — the active team's crest, never the wrong side's.
    // The previous (Argentina) overlay animates out, so poll until its crest has
    // cleared rather than reading mid-transition.
    await pick('Mbappé');
    await waitFor(() => expect(canvas.getAllByText('Mbappé').length).toBeGreaterThan(0));
    await waitFor(() => expect(hasImageHref(canvasElement, FRANCE_CREST)).toBe(true));
    await waitFor(() => expect(hasImageHref(canvasElement, ARGENTINA_CREST)).toBe(false));
  },
};

/**
 * "{Team} — whole team" switch. The per-side whole-team rows let the panel show
 * France's whole XI (not only one player). Picks "France — whole team" and
 * asserts France's starters render (Tchouaméni, Griezmann), Argentina has
 * dropped away, and the Starters / Subs toggle then scopes to FRANCE's subs
 * (Thuram) — i.e. the squad scope follows the switched side.
 */
export const SelectsFranceWholeTeam: Story = {
  args: { ...BothTeamsWithSubs.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText('De Paul')).toBeInTheDocument());

    await userEvent.click(canvas.getByRole('button', { name: /Player/i }));
    const listbox = await canvas.findByRole('listbox');
    await userEvent.click(within(listbox).getByRole('option', { name: 'France — whole team' }));
    await waitFor(() => expect(canvas.queryByRole('listbox')).not.toBeInTheDocument());

    // France's starting XI shows; Argentina is gone.
    await waitFor(() => expect(canvas.getByText('Tchouaméni')).toBeInTheDocument());
    await expect(canvas.getByText('Griezmann')).toBeInTheDocument();
    await expect(canvas.queryByText('De Paul')).not.toBeInTheDocument();

    // The Subs scope now follows France: flipping to Subs shows the France sub
    // (Thuram) and drops the France starters.
    await userEvent.click(canvas.getByRole('button', { name: 'Subs' }));
    await waitFor(() => expect(canvas.getByText('Thuram')).toBeInTheDocument());
    await expect(canvas.queryByText('Tchouaméni')).not.toBeInTheDocument();
  },
};

/**
 * Away whole-team focus wears the away crest (viz #34). In France's whole-team
 * view, focusing a France player must surface the focus card with FRANCE's flag,
 * not the home (Argentina) flag (which is what #31 left the away side without
 * any crest at all). Switches to "France — whole team", focuses a France player
 * via its hit-area, and asserts the focus card shows France's crest and never
 * the Argentina one.
 */
export const AwayWholeTeamFocusWearsAwayCrest: Story = {
  args: { ...BothTeamsWithSubs.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText('De Paul')).toBeInTheDocument());

    // Switch the panel to France's whole team.
    await userEvent.click(canvas.getByRole('button', { name: /Player/i }));
    const listbox = await canvas.findByRole('listbox');
    await userEvent.click(within(listbox).getByRole('option', { name: 'France — whole team' }));
    await waitFor(() => expect(canvas.queryByRole('listbox')).not.toBeInTheDocument());
    await waitFor(() => expect(canvas.getByText('Griezmann')).toBeInTheDocument());

    // Focus a France player's sonar → the focus card mounts wearing FRANCE's
    // crest; the home (Argentina) flag never appears for the away side.
    const hit = canvas.getByRole('button', { name: /Griezmann, \d+ passes/i });
    hit.focus();
    await waitFor(() => expect(hasImageHref(canvasElement, FRANCE_CREST)).toBe(true));
    await expect(hasImageHref(canvasElement, ARGENTINA_CREST)).toBe(false);
  },
};

/**
 * Subs-scope sonar lock (review #3, item 3). Each sub's wedge sonar is per-player
 * (no cross-player edges), so the Subs scope simply shows the substitutes, each
 * with their OWN passing wedges — it populates meaningfully (unlike the pass
 * NETWORK, where subs needed their passes-to-anyone). Flips to Subs and asserts a
 * sub (Paredes) shows, a starter (De Paul) drops away, and wedge paths are
 * actually drawn on the pitch.
 */
export const SubsSonarPopulates: Story = {
  args: { ...BothTeamsWithSubs.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Default = Starters: a starter shows, a sub doesn't.
    await waitFor(() => expect(canvas.getByText('De Paul')).toBeInTheDocument());
    await expect(canvas.queryByText('Paredes')).not.toBeInTheDocument();

    // Flip to Subs → the subs appear (with their own sonars), starters drop away.
    await userEvent.click(canvas.getByRole('button', { name: 'Subs' }));
    await waitFor(() => expect(canvas.getByText('Paredes')).toBeInTheDocument());
    await expect(canvas.getByText('Montiel')).toBeInTheDocument();
    await expect(canvas.queryByText('De Paul')).not.toBeInTheDocument();

    // The subs' sonar wedges are actually drawn (filled <path> sectors), so the
    // Subs view isn't an empty pitch.
    const wedges = [...canvasElement.querySelectorAll('svg path')].filter((p) => {
      const d = p.getAttribute('d') ?? '';
      // A wedge path is the "M … L … A … Z" sector (starts by moving to the hub).
      return d.startsWith('M') && d.includes('A') && d.trimEnd().endsWith('Z');
    });
    expect(wedges.length).toBeGreaterThan(0);
  },
};

/**
 * Regression lock for the transient `<circle r="undefined">` warning (viz #27,
 * item 7). Selecting a player mounts the enlarged focus sonar; swapping straight
 * to another player makes AnimatePresence run the previous overlay's EXIT while
 * the next one ENTERS, and the filtered visible set changes underneath. Any
 * animated geometry read mid-transition must resolve to a finite number. Spies
 * on `console.error` across the whole swap sequence and asserts no SVG-attribute
 * warning is emitted.
 */
export const SelectorSwapNoCircleWarning: Story = {
  args: { ...BothTeamsWithSubs.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const pick = async (name: string) => {
      await userEvent.click(canvas.getByRole('button', { name: /Player/i }));
      const listbox = await canvas.findByRole('listbox');
      await userEvent.click(within(listbox).getByRole('option', { name }));
      await waitFor(() => expect(canvas.queryByRole('listbox')).not.toBeInTheDocument());
    };

    await waitFor(() => expect(canvas.getByText('De Paul')).toBeInTheDocument());

    // Swap directly between single players (the enlarged focus sonar enter/exit
    // overlap), across team groups, then back to the whole team — polling every
    // animation frame so a transient undefined `r` is caught. React drops an `r`
    // that resolves to undefined (rendering `r=null`) and warns only in a dev
    // build; the vitest browser build suppresses that warning, so this DOM poll
    // is the reliable signal (see {@link collectBadCirclesDuring}).
    const bad = await collectBadCirclesDuring(canvasElement, async () => {
      await pick('Messi');
      await pick('De Paul');
      await pick('Mbappé');
      await pick('Whole team');
      await waitFor(() => expect(canvas.getByText('De Paul')).toBeInTheDocument());
    });

    expect(bad).toEqual([]);
  },
};

/**
 * Exercises the Starters / Subs toggle: by default a sub (Montiel) is hidden;
 * switching to Subs reveals subs and hides the starting XI.
 */
export const StartersSubsToggle: Story = {
  args: { ...BothTeamsWithSubs.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Default scope = Starters: a starter (De Paul) shows, a sub (Montiel) doesn't.
    await waitFor(() => expect(canvas.getByText('De Paul')).toBeInTheDocument());
    await expect(canvas.queryByText('Montiel')).not.toBeInTheDocument();

    // Flip to Subs: the sub appears and the starting XI drops away.
    await userEvent.click(canvas.getByRole('button', { name: 'Subs' }));
    await waitFor(() => expect(canvas.getByText('Montiel')).toBeInTheDocument());
    await expect(canvas.queryByText('De Paul')).not.toBeInTheDocument();
  },
};
