import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { SeasonLines } from './season-lines';

const SEASONS = [
  { label: '2023-24', caption: 'AZ, 1,840 min' },
  { label: '2024-25', caption: 'AZ, 2,610 min' },
  { label: '2025-26', caption: 'Feyenoord, 2,210 min' },
  { label: '2026-27', caption: 'Feyenoord, 2,014 min' },
];

const meta = {
  title: 'Stats/SeasonLines',
  component: SeasonLines,
  parameters: { layout: 'padded', backgrounds: { default: 'dark' } },
  tags: ['autodocs'],
} satisfies Meta<typeof SeasonLines>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    seasons: SEASONS,
    series: [
      {
        label: 'Non-penalty goals and assists per 90',
        role: 'subject',
        values: [0.42, 0.61, 0.58, 0.73],
      },
      { label: 'Key passes per 90', role: 'secondary', values: [1.1, 1.4, 1.6, 1.52] },
    ],
  },
};

/** 2023 and 2024 can be missing `acc`-shaped rates (spec §1.5); the line breaks, it never draws through a gap as zero. */
export const GapInOneSeason: Story = {
  name: 'A missing season breaks the line',
  args: {
    seasons: SEASONS,
    series: [
      {
        label: 'Non-penalty goals and assists per 90',
        role: 'subject',
        values: [0.42, null, 0.58, 0.73],
      },
      { label: 'Key passes per 90', role: 'secondary', values: [1.1, 1.4, 1.6, 1.52] },
    ],
  },
  play: async ({ canvasElement }) => {
    const polylines = canvasElement
      .querySelectorAll('[data-slot="season-line"]')[0]
      ?.querySelectorAll('polyline');
    expect(polylines?.length, 'a null value splits the subject line into two runs').toBe(2);
  },
};

export const SingleSeason: Story = {
  args: {
    seasons: [{ label: '2026-27', caption: 'Feyenoord, 2,014 min' }],
    series: [{ label: 'Non-penalty goals and assists per 90', role: 'subject', values: [0.73] }],
  },
};
