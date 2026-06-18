import type { Meta, StoryObj } from '@storybook/react-vite';

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

// Argentina 4-3-3, attacking left → right (x,y on the 0–100 pitch).
const ARGENTINA: PassSonarPlayer[] = [
  {
    id: 'gk',
    name: 'E. Martínez',
    x: 8,
    y: 50,
    wedges: [w(0, 34, 8), w(45, 30, 4), w(315, 30, 4), w(90, 20, 3), w(270, 20, 3), w(180, 8, 1)],
  },
  {
    id: 'rb',
    name: 'Molina',
    x: 32,
    y: 82,
    wedges: [w(0, 18, 9), w(315, 15, 12), w(270, 12, 8), w(225, 10, 5), w(45, 16, 4)],
  },
  {
    id: 'rcb',
    name: 'Romero',
    x: 24,
    y: 62,
    wedges: [w(0, 16, 10), w(315, 14, 14), w(270, 10, 9), w(45, 14, 6), w(180, 9, 3)],
  },
  {
    id: 'lcb',
    name: 'Otamendi',
    x: 24,
    y: 38,
    wedges: [w(0, 16, 10), w(45, 14, 14), w(90, 10, 9), w(315, 14, 6), w(180, 9, 3)],
  },
  {
    id: 'lb',
    name: 'Tagliafico',
    x: 32,
    y: 18,
    wedges: [w(0, 18, 9), w(45, 15, 12), w(90, 12, 8), w(135, 10, 5), w(315, 16, 4)],
  },
  {
    id: 'dm',
    name: 'Fernández',
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
    x: 56,
    y: 62,
    wedges: [w(0, 16, 11), w(315, 14, 10), w(270, 12, 9), w(45, 14, 7), w(225, 10, 4)],
  },
  {
    id: 'lcm',
    name: 'Mac Allister',
    x: 56,
    y: 38,
    wedges: [w(0, 16, 11), w(45, 14, 10), w(90, 12, 9), w(315, 14, 7), w(135, 10, 4)],
  },
  {
    id: 'rw',
    name: 'Messi',
    x: 74,
    y: 80,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Lionel_Messi_WC2022.jpg',
    wedges: [w(315, 14, 16), w(0, 12, 9), w(270, 12, 10), w(225, 10, 6), w(180, 8, 4)],
  },
  {
    id: 'lw',
    name: 'Di María',
    x: 74,
    y: 20,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Angel_Di_Maria_2018.jpg',
    wedges: [w(45, 14, 16), w(0, 12, 9), w(90, 12, 10), w(135, 10, 6), w(180, 8, 4)],
  },
  {
    id: 'st',
    name: 'J. Álvarez',
    x: 80,
    y: 50,
    wedges: [w(135, 8, 7), w(225, 8, 7), w(90, 8, 6), w(270, 8, 6), w(0, 8, 4)],
  },
];

export const Argentina: Story = {
  args: {
    team: 'Argentina',
    crestUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag_of_Argentina.svg',
    players: ARGENTINA,
  },
};
