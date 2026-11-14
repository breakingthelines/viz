import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { StyleMap, type StyleMapPoint } from './style-map';

const crest = (n: number) => `https://media.api-sports.io/football/teams/${n}.png`;

const POINTS: StyleMapPoint[] = [
  { id: 'city', label: 'Manchester City', x: 65.5, y: 10.7, crest: crest(50) },
  { id: 'spurs', label: 'Tottenham Hotspur', x: 62.7, y: 8.7, crest: crest(47) },
  { id: 'arsenal', label: 'Arsenal', x: 59.8, y: 11.7, crest: crest(42) },
  { id: 'brighton', label: 'Brighton', x: 59.5, y: 9.9, crest: crest(51) },
  { id: 'liverpool', label: 'Liverpool', x: 52.9, y: 9.9, crest: crest(40) },
  { id: 'chelsea', label: 'Chelsea', x: 49.9, y: 12.8, crest: crest(49) },
  { id: 'newcastle', label: 'Newcastle', x: 50.4, y: 12.5, crest: crest(34) },
  { id: 'everton', label: 'Everton', x: 46.7, y: 14.7, crest: crest(45) },
  { id: 'palace', label: 'Crystal Palace', x: 43.1, y: 12.9, crest: crest(52) },
  { id: 'hull', label: 'Hull City', x: 33.1, y: 16.0, crest: crest(64) },
];

const meta = {
  title: 'Stats/StyleMap',
  component: StyleMap,
  parameters: { layout: 'padded', backgrounds: { default: 'dark' } },
  tags: ['autodocs'],
  args: {
    points: POINTS,
    xLabel: 'Possession',
    yLabel: 'PPDA',
    ariaLabel: 'Premier League style map, possession against PPDA',
    invertY: true,
    formatX: (v: number) => `${Math.round(v)}%`,
  },
} satisfies Meta<typeof StyleMap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PremierLeague: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('img', { name: /style map/ })).toBeInTheDocument();
    await expect(canvasElement.querySelectorAll('[data-slot="style-map-team"]').length).toBe(
      POINTS.length
    );
  },
};

export const Phone: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    (Story) => (
      <div style={{ width: 358 }}>
        <Story />
      </div>
    ),
  ],
};
