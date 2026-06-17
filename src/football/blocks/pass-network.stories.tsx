import type { Meta, StoryObj } from '@storybook/react';
import { PassNetwork } from '#/football/blocks/pass-network';
import type { PassNetworkLink, PassNetworkPlayer } from '#/football/blocks/pass-network';

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

export const Argentina: Story = {
  args: {
    team: 'Argentina',
    players: ARGENTINA_PLAYERS,
    links: ARGENTINA_LINKS,
  },
};

export const CustomAccent: Story = {
  args: {
    team: 'Argentina',
    color: '#75aadb',
    players: ARGENTINA_PLAYERS,
    links: ARGENTINA_LINKS,
  },
};
