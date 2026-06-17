import type { Meta, StoryObj } from '@storybook/react-vite';
import { ShotMap } from './shot-map';
import type { Shot } from './shot-map';

const meta = {
  title: 'Football/Blocks/ShotMap',
  component: ShotMap,
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
} satisfies Meta<typeof ShotMap>;

export default meta;
type Story = StoryObj<typeof meta>;

// A compact, plausible freeze-frame: a clutch of defenders + a keeper between
// the shot and goal, plus a couple of the shooter's team-mates. StatsBomb
// 120×80 coords. `gk` places a keeper near the relevant goal line.
function frame(shotX: number, shotY: number, toRightGoal: boolean): Shot['freezeFrame'] {
  const goalX = toRightGoal ? 120 : 0;
  const dir = toRightGoal ? 1 : -1;
  const lerp = (t: number) => ({
    x: shotX + (goalX - shotX) * t,
  });
  return [
    // Keeper just off the line.
    { x: goalX - dir * 2.5, y: 40, teammate: false, keeper: true },
    // Defensive block.
    { x: lerp(0.35).x, y: shotY - 5.5, teammate: false, keeper: false },
    { x: lerp(0.45).x, y: shotY + 3.5, teammate: false, keeper: false },
    { x: lerp(0.6).x, y: 44, teammate: false, keeper: false },
    { x: lerp(0.25).x, y: shotY + 8, teammate: false, keeper: false },
    // A covering opponent wide.
    { x: lerp(0.5).x, y: 28, teammate: false, keeper: false },
    // Team-mates arriving.
    { x: shotX - dir * 6, y: shotY + 12, teammate: true, keeper: false },
    { x: shotX - dir * 9, y: 36, teammate: true, keeper: false },
  ];
}

// Argentina (home, red) v France (away, blue) — a 2–1 WC-final-flavoured
// knockout. Home attacks left→right, so home shots cluster at high x; away
// shots are given in their own attacking frame (high x) and the component
// mirrors them to the right-hand goal.
const ARG_FRA_SHOTS: Shot[] = [
  // --- Argentina (home) ---
  {
    id: 'h1',
    team: 'home',
    x: 88,
    y: 33,
    xg: 0.05,
    outcome: 'off-target',
    player: 'Á. Di María',
    minute: 9,
    freezeFrame: frame(88, 33, true),
  },
  {
    id: 'h2',
    team: 'home',
    x: 101,
    y: 30,
    xg: 0.21,
    outcome: 'saved',
    player: 'L. Messi',
    minute: 17,
    freezeFrame: frame(101, 30, true),
  },
  {
    id: 'h3',
    team: 'home',
    x: 109,
    y: 41,
    xg: 0.77,
    outcome: 'goal',
    player: 'L. Messi',
    minute: 23,
    freezeFrame: frame(109, 41, true),
  },
  {
    id: 'h4',
    team: 'home',
    x: 104,
    y: 46,
    xg: 0.34,
    outcome: 'goal',
    player: 'Á. Di María',
    minute: 36,
    freezeFrame: frame(104, 46, true),
  },
  {
    id: 'h5',
    team: 'home',
    x: 96,
    y: 24,
    xg: 0.08,
    outcome: 'blocked',
    player: 'J. Álvarez',
    minute: 52,
    freezeFrame: frame(96, 24, true),
  },
  {
    id: 'h6',
    team: 'home',
    x: 112,
    y: 38,
    xg: 0.44,
    outcome: 'saved',
    player: 'L. Messi',
    minute: 68,
    freezeFrame: frame(112, 38, true),
  },
  {
    id: 'h7',
    team: 'home',
    x: 99,
    y: 52,
    xg: 0.12,
    outcome: 'off-target',
    player: 'N. Molina',
    minute: 74,
    freezeFrame: frame(99, 52, true),
  },
  {
    id: 'h8',
    team: 'home',
    x: 113,
    y: 44,
    xg: 0.62,
    outcome: 'saved',
    player: 'L. Messi',
    minute: 108,
    freezeFrame: frame(113, 44, true),
  },
  // --- France (away) — given in their own attacking frame (high x). ---
  {
    id: 'a1',
    team: 'away',
    x: 92,
    y: 47,
    xg: 0.04,
    outcome: 'off-target',
    player: 'O. Dembélé',
    minute: 28,
    freezeFrame: frame(92, 47, true),
  },
  {
    id: 'a2',
    team: 'away',
    x: 100,
    y: 50,
    xg: 0.09,
    outcome: 'blocked',
    player: 'A. Tchouaméni',
    minute: 41,
    freezeFrame: frame(100, 50, true),
  },
  {
    id: 'a3',
    team: 'away',
    x: 108,
    y: 38,
    xg: 0.79,
    outcome: 'goal',
    player: 'K. Mbappé',
    minute: 80,
    freezeFrame: frame(108, 38, true),
  },
  {
    id: 'a4',
    team: 'away',
    x: 103,
    y: 44,
    xg: 0.31,
    outcome: 'goal',
    player: 'K. Mbappé',
    minute: 81,
    freezeFrame: frame(103, 44, true),
  },
  {
    id: 'a5',
    team: 'away',
    x: 97,
    y: 33,
    xg: 0.14,
    outcome: 'saved',
    player: 'M. Thuram',
    minute: 97,
    freezeFrame: frame(97, 33, true),
  },
  {
    id: 'a6',
    team: 'away',
    x: 110,
    y: 49,
    xg: 0.55,
    outcome: 'saved',
    player: 'K. Mbappé',
    minute: 118,
    freezeFrame: frame(110, 49, true),
  },
  {
    id: 'a7',
    team: 'away',
    x: 90,
    y: 27,
    xg: 0.06,
    outcome: 'off-target',
    player: 'K. Coman',
    minute: 121,
    freezeFrame: frame(90, 27, true),
  },
];

/** The headline match: Argentina v France, 3–3 over 120 minutes. */
export const Default: Story = {
  args: {
    homeTeam: 'Argentina',
    awayTeam: 'France',
    shots: ARG_FRA_SHOTS,
  },
};

// A tighter 1–0 semi-final: Argentina edge Croatia, home dominant.
const ARG_CRO_SHOTS: Shot[] = [
  {
    id: 'c-h1',
    team: 'home',
    x: 110,
    y: 40,
    xg: 0.76,
    outcome: 'goal',
    player: 'J. Álvarez',
    minute: 39,
    freezeFrame: frame(110, 40, true),
  },
  {
    id: 'c-h2',
    team: 'home',
    x: 102,
    y: 32,
    xg: 0.18,
    outcome: 'saved',
    player: 'L. Messi',
    minute: 34,
    freezeFrame: frame(102, 32, true),
  },
  {
    id: 'c-h3',
    team: 'home',
    x: 113,
    y: 45,
    xg: 0.69,
    outcome: 'goal',
    player: 'J. Álvarez',
    minute: 69,
    freezeFrame: frame(113, 45, true),
  },
  {
    id: 'c-h4',
    team: 'home',
    x: 107,
    y: 36,
    xg: 0.41,
    outcome: 'goal',
    player: 'L. Messi',
    minute: 70,
    freezeFrame: frame(107, 36, true),
  },
  {
    id: 'c-h5',
    team: 'home',
    x: 95,
    y: 51,
    xg: 0.07,
    outcome: 'off-target',
    player: 'E. Fernández',
    minute: 58,
    freezeFrame: frame(95, 51, true),
  },
  {
    id: 'c-h6',
    team: 'home',
    x: 98,
    y: 22,
    xg: 0.1,
    outcome: 'blocked',
    player: 'N. Tagliafico',
    minute: 84,
    freezeFrame: frame(98, 22, true),
  },
  {
    id: 'c-a1',
    team: 'away',
    x: 99,
    y: 46,
    xg: 0.11,
    outcome: 'saved',
    player: 'A. Kramarić',
    minute: 22,
    freezeFrame: frame(99, 46, true),
  },
  {
    id: 'c-a2',
    team: 'away',
    x: 93,
    y: 34,
    xg: 0.05,
    outcome: 'off-target',
    player: 'M. Brozović',
    minute: 48,
    freezeFrame: frame(93, 34, true),
  },
  {
    id: 'c-a3',
    team: 'away',
    x: 105,
    y: 52,
    xg: 0.27,
    outcome: 'saved',
    player: 'B. Petković',
    minute: 77,
    freezeFrame: frame(105, 52, true),
  },
  {
    id: 'c-a4',
    team: 'away',
    x: 90,
    y: 41,
    xg: 0.04,
    outcome: 'blocked',
    player: 'I. Perišić',
    minute: 90,
    freezeFrame: frame(90, 41, true),
  },
];

/** A 3–0 semi-final — home-dominant, sparse away threat. */
export const SemiFinal: Story = {
  args: {
    homeTeam: 'Argentina',
    awayTeam: 'Croatia',
    shots: ARG_CRO_SHOTS,
  },
};
