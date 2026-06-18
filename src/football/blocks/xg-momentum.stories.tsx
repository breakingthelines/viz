import type { Meta, StoryObj } from '@storybook/react-vite';
import { XgMomentum, type XgMomentumShot } from './xg-momentum';

const meta = {
  title: 'Football/Blocks/XgMomentum',
  component: XgMomentum,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  // Dark editorial surface, ~720px — the BTL reader page.
  decorators: [
    (Story) => (
      <div style={{ width: '720px', background: '#0a0a0a', padding: '28px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof XgMomentum>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Argentina v France — the 2022 final reimagined as a cumulative-xG race.
 * Argentina create the better chances through the first hour (two goals on the
 * line), France surge late as the game opens up. ~14 shots, finishing roughly
 * 2.4 xG to 1.6 — one side edging it, the other within touching distance.
 */
const finalShots: XgMomentumShot[] = [
  { minute: 8, team: 'home', xg: 0.06, player: 'Ángel Di María', outcome: 'off-target' },
  { minute: 17, team: 'home', xg: 0.09, player: 'Julián Álvarez', outcome: 'blocked' },
  { minute: 22, team: 'home', xg: 0.79, player: 'Lionel Messi', outcome: 'goal' },
  { minute: 31, team: 'away', xg: 0.04, player: 'Ousmane Dembélé', outcome: 'off-target' },
  { minute: 36, team: 'home', xg: 0.71, player: 'Ángel Di María', outcome: 'goal' },
  { minute: 41, team: 'home', xg: 0.08, player: 'Alexis Mac Allister', outcome: 'saved' },
  { minute: 54, team: 'away', xg: 0.05, player: 'Kylian Mbappé', outcome: 'blocked' },
  { minute: 63, team: 'home', xg: 0.12, player: 'Julián Álvarez', outcome: 'saved' },
  { minute: 71, team: 'away', xg: 0.07, player: 'Marcus Thuram', outcome: 'off-target' },
  { minute: 79, team: 'away', xg: 0.76, player: 'Kylian Mbappé', outcome: 'goal' },
  { minute: 81, team: 'away', xg: 0.78, player: 'Kylian Mbappé', outcome: 'goal' },
  { minute: 86, team: 'home', xg: 0.1, player: 'Lautaro Martínez', outcome: 'saved' },
  { minute: 90, team: 'away', xg: 0.09, player: 'Randal Kolo Muani', outcome: 'off-target' },
  { minute: 94, team: 'home', xg: 0.55, player: 'Lionel Messi', outcome: 'goal' },
];

// Wikimedia national flags, used as team crests.
const FLAG_ARGENTINA = 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag_of_Argentina.svg';
const FLAG_FRANCE = 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg';
const FLAG_ENGLAND = 'https://upload.wikimedia.org/wikipedia/commons/b/be/Flag_of_England.svg';
const FLAG_PORTUGAL = 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Portugal.svg';

export const Final2022: Story = {
  args: {
    homeTeam: 'Argentina',
    awayTeam: 'France',
    homeCrestUrl: FLAG_ARGENTINA,
    awayCrestUrl: FLAG_FRANCE,
    shots: finalShots,
  },
};

/**
 * The same race, with circular scorer headshots on the goal markers (the
 * optional `imageUrl` per shot). Non-goal shots and goals without an image fall
 * back to the plain filled dot.
 */
const headshotShots: XgMomentumShot[] = finalShots.map((shot) =>
  shot.outcome === 'goal'
    ? {
        ...shot,
        imageUrl: `https://i.pravatar.cc/96?u=${encodeURIComponent(shot.player + shot.minute)}`,
      }
    : shot
);

export const WithScorerHeadshots: Story = {
  args: {
    homeTeam: 'Argentina',
    awayTeam: 'France',
    homeCrestUrl: FLAG_ARGENTINA,
    awayCrestUrl: FLAG_FRANCE,
    shots: headshotShots,
  },
};

/**
 * A tighter, lower-event 1–0 knockout: one chance-light side nicks it from a
 * single high-quality opening, the other never quite finds the killer ball.
 * Exercises the auto-scaled y-axis at a smaller xG ceiling.
 */
const lowEventShots: XgMomentumShot[] = [
  { minute: 12, team: 'away', xg: 0.05, player: 'Bruno Fernandes', outcome: 'off-target' },
  { minute: 24, team: 'home', xg: 0.08, player: 'Bukayo Saka', outcome: 'blocked' },
  { minute: 33, team: 'home', xg: 0.11, player: 'Harry Kane', outcome: 'saved' },
  { minute: 49, team: 'away', xg: 0.06, player: 'João Félix', outcome: 'saved' },
  { minute: 58, team: 'home', xg: 0.62, player: 'Marcus Rashford', outcome: 'goal' },
  { minute: 67, team: 'away', xg: 0.14, player: 'Bernardo Silva', outcome: 'off-target' },
  { minute: 74, team: 'home', xg: 0.07, player: 'Phil Foden', outcome: 'blocked' },
  { minute: 88, team: 'away', xg: 0.18, player: 'Cristiano Ronaldo', outcome: 'saved' },
];

export const LowEventOneNil: Story = {
  args: {
    homeTeam: 'England',
    awayTeam: 'Portugal',
    homeCrestUrl: FLAG_ENGLAND,
    awayCrestUrl: FLAG_PORTUGAL,
    shots: lowEventShots,
  },
};
