import type { Meta, StoryObj } from '@storybook/react-vite';
import { Progression } from './progression';
import type { ProgressionAction } from './progression';

const meta = {
  title: 'Football/Blocks/Progression',
  component: Progression,
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
} satisfies Meta<typeof Progression>;

export default meta;
type Story = StoryObj<typeof meta>;

// Argentina's ball progression from a WC2022 knockout, in StatsBomb 120×80
// coords in the team's own attacking frame (high x = the goal it attacks).
// A believable mix: De Paul / Mac Allister carrying out of midfield, Messi and
// Di María threading the higher-value balls between the lines and into the box.
// Per-action xT runs ~0.01–0.15; the biggest values feed the penalty area.
const ARG_PROGRESSION: ProgressionAction[] = [
  // --- Deep build-up: low xT, advancing out of the back ---
  {
    id: 'p1',
    type: 'pass',
    startX: 22,
    startY: 30,
    endX: 40,
    endY: 22,
    xt: 0.014,
    player: 'C. Romero',
  },
  {
    id: 'p2',
    type: 'carry',
    startX: 38,
    startY: 52,
    endX: 55,
    endY: 58,
    xt: 0.021,
    player: 'N. Otamendi',
  },
  {
    id: 'p3',
    type: 'pass',
    startX: 30,
    startY: 44,
    endX: 48,
    endY: 40,
    xt: 0.018,
    player: 'R. De Paul',
  },
  {
    id: 'p4',
    type: 'carry',
    startX: 46,
    startY: 18,
    endX: 64,
    endY: 14,
    xt: 0.034,
    player: 'N. Molina',
  },

  // --- Middle third: progressive carries through the lines ---
  {
    id: 'p5',
    type: 'carry',
    startX: 52,
    startY: 48,
    endX: 72,
    endY: 46,
    xt: 0.046,
    player: 'R. De Paul',
  },
  {
    id: 'p6',
    type: 'pass',
    startX: 56,
    startY: 36,
    endX: 76,
    endY: 30,
    xt: 0.052,
    player: 'A. Mac Allister',
  },
  {
    id: 'p7',
    type: 'carry',
    startX: 60,
    startY: 62,
    endX: 78,
    endY: 68,
    xt: 0.041,
    player: 'M. Acuña',
  },
  {
    id: 'p8',
    type: 'pass',
    startX: 58,
    startY: 50,
    endX: 80,
    endY: 52,
    xt: 0.058,
    player: 'E. Fernández',
  },

  // --- Entering the final third ---
  {
    id: 'p9',
    type: 'carry',
    startX: 74,
    startY: 28,
    endX: 92,
    endY: 22,
    xt: 0.071,
    player: 'Á. Di María',
  },
  {
    id: 'p10',
    type: 'pass',
    startX: 78,
    startY: 60,
    endX: 96,
    endY: 64,
    xt: 0.066,
    player: 'A. Mac Allister',
  },
  {
    id: 'p11',
    type: 'carry',
    startX: 82,
    startY: 44,
    endX: 99,
    endY: 40,
    xt: 0.083,
    player: 'L. Messi',
  },
  {
    id: 'p12',
    type: 'pass',
    startX: 80,
    startY: 36,
    endX: 100,
    endY: 34,
    xt: 0.077,
    player: 'R. De Paul',
  },

  // --- High-value balls between the lines / into the box ---
  {
    id: 'p13',
    type: 'pass',
    startX: 92,
    startY: 24,
    endX: 108,
    endY: 38,
    xt: 0.118,
    player: 'L. Messi',
  },
  {
    id: 'p14',
    type: 'carry',
    startX: 95,
    startY: 66,
    endX: 110,
    endY: 52,
    xt: 0.104,
    player: 'Á. Di María',
  },
  {
    id: 'p15',
    type: 'pass',
    startX: 98,
    startY: 50,
    endX: 112,
    endY: 44,
    xt: 0.139,
    player: 'L. Messi',
  },
  {
    id: 'p16',
    type: 'carry',
    startX: 100,
    startY: 30,
    endX: 113,
    endY: 40,
    xt: 0.126,
    player: 'J. Álvarez',
  },
  {
    id: 'p17',
    type: 'pass',
    startX: 96,
    startY: 58,
    endX: 110,
    endY: 47,
    xt: 0.092,
    player: 'E. Fernández',
  },
  {
    id: 'p18',
    type: 'carry',
    startX: 102,
    startY: 42,
    endX: 114,
    endY: 46,
    xt: 0.111,
    player: 'J. Álvarez',
  },

  // --- A couple of switches that reset the attack (modest xT) ---
  {
    id: 'p19',
    type: 'pass',
    startX: 70,
    startY: 18,
    endX: 84,
    endY: 64,
    xt: 0.029,
    player: 'R. De Paul',
  },
  {
    id: 'p20',
    type: 'pass',
    startX: 66,
    startY: 70,
    endX: 82,
    endY: 20,
    xt: 0.026,
    player: 'A. Mac Allister',
  },
];

/** The headline view: Argentina advancing on the right-hand goal. */
export const Default: Story = {
  args: {
    team: 'Argentina',
    crestUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag_of_Argentina.svg',
    actions: ARG_PROGRESSION,
  },
};

// A France set, away-flavoured blue, fewer actions but Mbappé-heavy on the left.
const FRA_PROGRESSION: ProgressionAction[] = [
  {
    id: 'f1',
    type: 'carry',
    startX: 40,
    startY: 26,
    endX: 58,
    endY: 20,
    xt: 0.024,
    player: 'T. Hernández',
  },
  {
    id: 'f2',
    type: 'pass',
    startX: 34,
    startY: 50,
    endX: 52,
    endY: 46,
    xt: 0.019,
    player: 'A. Tchouaméni',
  },
  {
    id: 'f3',
    type: 'carry',
    startX: 54,
    startY: 60,
    endX: 74,
    endY: 64,
    xt: 0.048,
    player: 'K. Mbappé',
  },
  {
    id: 'f4',
    type: 'pass',
    startX: 60,
    startY: 38,
    endX: 80,
    endY: 34,
    xt: 0.055,
    player: 'A. Griezmann',
  },
  {
    id: 'f5',
    type: 'carry',
    startX: 72,
    startY: 66,
    endX: 94,
    endY: 60,
    xt: 0.089,
    player: 'K. Mbappé',
  },
  {
    id: 'f6',
    type: 'pass',
    startX: 78,
    startY: 30,
    endX: 98,
    endY: 36,
    xt: 0.072,
    player: 'A. Griezmann',
  },
  {
    id: 'f7',
    type: 'pass',
    startX: 92,
    startY: 58,
    endX: 110,
    endY: 46,
    xt: 0.131,
    player: 'A. Griezmann',
  },
  {
    id: 'f8',
    type: 'carry',
    startX: 96,
    startY: 64,
    endX: 112,
    endY: 50,
    xt: 0.147,
    player: 'K. Mbappé',
  },
  {
    id: 'f9',
    type: 'pass',
    startX: 88,
    startY: 22,
    endX: 106,
    endY: 40,
    xt: 0.096,
    player: 'O. Dembélé',
  },
  {
    id: 'f10',
    type: 'carry',
    startX: 100,
    startY: 44,
    endX: 113,
    endY: 42,
    xt: 0.108,
    player: 'R. Kolo Muani',
  },
  {
    id: 'f11',
    type: 'pass',
    startX: 64,
    startY: 18,
    endX: 82,
    endY: 62,
    xt: 0.027,
    player: 'A. Tchouaméni',
  },
  {
    id: 'f12',
    type: 'carry',
    startX: 50,
    startY: 44,
    endX: 70,
    endY: 42,
    xt: 0.038,
    player: 'A. Rabiot',
  },
  {
    id: 'f13',
    type: 'pass',
    startX: 82,
    startY: 50,
    endX: 100,
    endY: 30,
    xt: 0.063,
    player: 'A. Griezmann',
  },
  {
    id: 'f14',
    type: 'carry',
    startX: 94,
    startY: 36,
    endX: 109,
    endY: 44,
    xt: 0.101,
    player: 'K. Mbappé',
  },
  {
    id: 'f15',
    type: 'pass',
    startX: 46,
    startY: 60,
    endX: 64,
    endY: 56,
    xt: 0.022,
    player: 'T. Hernández',
  },
  {
    id: 'f16',
    type: 'carry',
    startX: 58,
    startY: 28,
    endX: 78,
    endY: 24,
    xt: 0.044,
    player: 'O. Dembélé',
  },
];

/** France's progression — a tighter set, weighted to the left channel. */
export const FranceLeftSide: Story = {
  args: {
    team: 'France',
    color: '#0091eb',
    crestUrl:
      'https://upload.wikimedia.org/wikipedia/en/thumb/0/01/France_national_football_team_seal.svg/180px-France_national_football_team_seal.svg.png',
    actions: FRA_PROGRESSION,
  },
};
