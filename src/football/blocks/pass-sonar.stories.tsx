import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { PassSonar } from './pass-sonar';
import type { PassSonarPlayer, PassWedge } from './pass-sonar';

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

/** Original single-team sonar (now with team/starter tags on the XI). */
export const Argentina: Story = {
  args: {
    team: 'Argentina',
    crestUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag_of_Argentina.svg',
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
    crestUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag_of_Argentina.svg',
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
