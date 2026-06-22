import type { Meta, StoryObj } from '@storybook/react-vite';
import { PitchControl, type PitchControlPlayer } from './pitch-control';
import {
  expectCanvasVisibleOnFirstFrame,
  expectSvgContentVisibleOnFirstFrame,
  withReducedMotion,
} from '#/test/entrance-lock';

const meta = {
  title: 'Football/Blocks/PitchControl',
  component: PitchControl,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  // Dark reader surface, ~720px — the panel sits quietly inline like the Shot map.
  decorators: [
    (Story) => (
      <div style={{ width: '720px', background: '#0a0a0a', padding: '28px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PitchControl>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A settled mid-block snapshot in StatsBomb 120×80 coordinates. The home side
 * is camped higher up the pitch (a sustained press / territorial phase) while
 * the away side defends in a compact mid-low block — so the territory wash
 * tilts home, reading roughly 58 / 42. Both keepers are marked.
 */
const midBlock: PitchControlPlayer[] = [
  // HOME — pushed up, attacking right. GK on the edge of his box.
  { id: 'h-gk', x: 18, y: 40, team: 'home', isGoalkeeper: true, name: 'Raya' },
  { id: 'h-rb', x: 62, y: 8, team: 'home', name: 'White' },
  { id: 'h-rcb', x: 48, y: 30, team: 'home', name: 'Saliba' },
  { id: 'h-lcb', x: 48, y: 50, team: 'home', name: 'Gabriel' },
  { id: 'h-lb', x: 62, y: 72, team: 'home', name: 'Zinchenko' },
  { id: 'h-rcm', x: 72, y: 28, team: 'home', name: 'Ødegaard' },
  { id: 'h-dm', x: 64, y: 40, team: 'home', name: 'Rice' },
  { id: 'h-lcm', x: 72, y: 52, team: 'home', name: 'Havertz' },
  { id: 'h-rw', x: 92, y: 14, team: 'home', name: 'Saka' },
  { id: 'h-st', x: 96, y: 40, team: 'home', name: 'Jesus' },
  { id: 'h-lw', x: 92, y: 66, team: 'home', name: 'Martinelli' },

  // AWAY — compact mid-low block, defending its own (right→left mirrored) end.
  { id: 'a-gk', x: 104, y: 40, team: 'away', isGoalkeeper: true, name: 'Pickford' },
  { id: 'a-rb', x: 84, y: 70, team: 'away', name: 'Young' },
  { id: 'a-rcb', x: 90, y: 50, team: 'away', name: 'Tarkowski' },
  { id: 'a-lcb', x: 90, y: 30, team: 'away', name: 'Branthwaite' },
  { id: 'a-lb', x: 84, y: 10, team: 'away', name: 'Mykolenko' },
  { id: 'a-rcm', x: 70, y: 56, team: 'away', name: 'Garner' },
  { id: 'a-dm', x: 74, y: 40, team: 'away', name: 'Gueye' },
  { id: 'a-lcm', x: 70, y: 24, team: 'away', name: 'Onana' },
  { id: 'a-rw', x: 58, y: 60, team: 'away', name: 'McNeil' },
  { id: 'a-st', x: 54, y: 40, team: 'away', name: 'Calvert-Lewin' },
  { id: 'a-lw', x: 58, y: 20, team: 'away', name: 'Harrison' },
];

export const MidBlock: Story = {
  args: {
    homeTeam: 'Arsenal',
    awayTeam: 'Everton',
    homeCrestUrl: 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
    awayCrestUrl: 'https://upload.wikimedia.org/wikipedia/en/7/7c/Everton_FC_logo.svg',
    players: midBlock,
  },
};

/**
 * A more balanced, end-to-end shape — both teams holding their own halves with
 * the line of confrontation around the centre. The split bar sits close to
 * 50 / 50 and the wash is calmer through midfield.
 */
const evenGame: PitchControlPlayer[] = [
  // HOME — own half, attacking right.
  { id: 'h-gk', x: 8, y: 40, team: 'home', isGoalkeeper: true, name: 'Alisson' },
  { id: 'h-rb', x: 30, y: 12, team: 'home', name: 'Alexander-Arnold' },
  { id: 'h-rcb', x: 22, y: 32, team: 'home', name: 'Konaté' },
  { id: 'h-lcb', x: 22, y: 48, team: 'home', name: 'van Dijk' },
  { id: 'h-lb', x: 30, y: 68, team: 'home', name: 'Robertson' },
  { id: 'h-rcm', x: 44, y: 26, team: 'home', name: 'Mac Allister' },
  { id: 'h-dm', x: 38, y: 40, team: 'home', name: 'Endo' },
  { id: 'h-lcm', x: 44, y: 54, team: 'home', name: 'Szoboszlai' },
  { id: 'h-rw', x: 56, y: 16, team: 'home', name: 'Salah' },
  { id: 'h-st', x: 58, y: 40, team: 'home', name: 'Núñez' },
  { id: 'h-lw', x: 56, y: 64, team: 'home', name: 'Díaz' },

  // AWAY — own half, mirrored, defending the right end.
  { id: 'a-gk', x: 112, y: 40, team: 'away', isGoalkeeper: true, name: 'Ederson' },
  { id: 'a-rb', x: 90, y: 68, team: 'away', name: 'Walker' },
  { id: 'a-rcb', x: 98, y: 48, team: 'away', name: 'Dias' },
  { id: 'a-lcb', x: 98, y: 32, team: 'away', name: 'Aké' },
  { id: 'a-lb', x: 90, y: 12, team: 'away', name: 'Gvardiol' },
  { id: 'a-rcm', x: 76, y: 54, team: 'away', name: 'De Bruyne' },
  { id: 'a-dm', x: 82, y: 40, team: 'away', name: 'Rodri' },
  { id: 'a-lcm', x: 76, y: 26, team: 'away', name: 'Bernardo' },
  { id: 'a-rw', x: 64, y: 64, team: 'away', name: 'Foden' },
  { id: 'a-st', x: 62, y: 40, team: 'away', name: 'Haaland' },
  { id: 'a-lw', x: 64, y: 16, team: 'away', name: 'Grealish' },
];

export const EvenContest: Story = {
  args: {
    homeTeam: 'Liverpool',
    awayTeam: 'Manchester City',
    homeCrestUrl: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
    awayCrestUrl: 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
    players: evenGame,
  },
};

/**
 * A SPARSE input — only a handful of players, clustered on one side. This is the
 * degenerate shape a host produces if it feeds a single clustered moment (e.g.
 * one shot's 360 freeze-frame, where tracked players bunch in one box) instead
 * of both sides' AVERAGE positions. The block must NOT collapse into one solid
 * territory: with the capped-reach influence model, far-from-everyone space
 * stays neutral dark and only the pockets around the players are washed, so the
 * result reads as a few contested zones rather than "one team owns 99%". The
 * real fix for the lopsided split is the INPUT — pass each side's average
 * position over the match (see {@link EvenContest} / {@link MidBlock}), which
 * spreads ~22 dots across the pitch and tessellates the whole surface.
 */
const sparseFrame: PitchControlPlayer[] = [
  { id: 'h-st', x: 96, y: 38, team: 'home', name: 'Jesus' },
  { id: 'h-rw', x: 92, y: 16, team: 'home', name: 'Saka' },
  { id: 'a-rcb', x: 90, y: 48, team: 'away', name: 'Tarkowski' },
  { id: 'a-gk', x: 104, y: 40, team: 'away', isGoalkeeper: true, name: 'Pickford' },
];

export const SparseFrame: Story = {
  args: {
    homeTeam: 'Arsenal',
    awayTeam: 'Everton',
    homeCrestUrl: 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
    awayCrestUrl: 'https://upload.wikimedia.org/wikipedia/en/7/7c/Everton_FC_logo.svg',
    players: sparseFrame,
  },
};

/**
 * Both teams' AVERAGE positions from a real match — the canonical input. The
 * home side (left, attacking right) holds a slightly higher block, the away side
 * sits a touch deeper, and the line of confrontation falls just past halfway. A
 * dense spread of 22 dots makes the surface a continuous whole-pitch
 * tessellation (no black void through midfield) with the share summing across
 * the full pitch. Mirrors the shape the studio host now bakes for the
 * StatsBomb-open WC final block (avg x/y per player, both teams, 120×80).
 */
const averagePositions: PitchControlPlayer[] = [
  // HOME — average positions, slightly advanced, attacking right.
  { id: 'h-gk', x: 14, y: 40, team: 'home', isGoalkeeper: true, name: 'E Martínez' },
  { id: 'h-rb', x: 52, y: 14, team: 'home', name: 'Molina' },
  { id: 'h-rcb', x: 38, y: 30, team: 'home', name: 'Romero' },
  { id: 'h-lcb', x: 38, y: 50, team: 'home', name: 'Otamendi' },
  { id: 'h-lb', x: 50, y: 66, team: 'home', name: 'Tagliafico' },
  { id: 'h-rcm', x: 62, y: 30, team: 'home', name: 'De Paul' },
  { id: 'h-dm', x: 54, y: 42, team: 'home', name: 'Fernández' },
  { id: 'h-lcm', x: 64, y: 54, team: 'home', name: 'Mac Allister' },
  { id: 'h-rw', x: 80, y: 22, team: 'home', name: 'Messi' },
  { id: 'h-st', x: 84, y: 44, team: 'home', name: 'Álvarez' },
  { id: 'h-lw', x: 78, y: 62, team: 'home', name: 'Di María' },

  // AWAY — average positions, deeper block, defending the right end.
  { id: 'a-gk', x: 108, y: 40, team: 'away', isGoalkeeper: true, name: 'Lloris' },
  { id: 'a-rb', x: 78, y: 70, team: 'away', name: 'Koundé' },
  { id: 'a-rcb', x: 90, y: 50, team: 'away', name: 'Varane' },
  { id: 'a-lcb', x: 90, y: 30, team: 'away', name: 'Upamecano' },
  { id: 'a-lb', x: 78, y: 12, team: 'away', name: 'T Hernández' },
  { id: 'a-rcm', x: 66, y: 52, team: 'away', name: 'Rabiot' },
  { id: 'a-dm', x: 72, y: 40, team: 'away', name: 'Tchouaméni' },
  { id: 'a-lcm', x: 66, y: 28, team: 'away', name: 'Griezmann' },
  { id: 'a-rw', x: 54, y: 60, team: 'away', name: 'Dembélé' },
  { id: 'a-st', x: 52, y: 40, team: 'away', name: 'Giroud' },
  { id: 'a-lw', x: 50, y: 20, team: 'away', name: 'Mbappé' },
];

export const AveragePositions: Story = {
  args: {
    homeTeam: 'Argentina',
    awayTeam: 'France',
    players: averagePositions,
  },
};

/**
 * Entrance-blank lock (viz #28). The control-surface canvas IS the visualisation
 * and the player dots are its key content; both started at
 * `initial={{ opacity: 0 }}`, so a dropped mount/hydration tick blanked the
 * block. This renders with all framer-motion animation disabled and asserts both
 * the canvas and the player dots are visible on the first frame without the
 * entrance firing. Locked: the canvas + dots use `initial={false}`.
 */
export const EntranceLock: Story = {
  args: { ...MidBlock.args },
  decorators: [withReducedMotion],
  play: async ({ canvasElement }) => {
    await expectCanvasVisibleOnFirstFrame(canvasElement);
    await expectSvgContentVisibleOnFirstFrame(canvasElement, { selector: 'circle', min: 8 });
  },
};
