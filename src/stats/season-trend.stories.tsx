import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { SeasonTrend, type SeasonTrendRow } from './season-trend';

const SEASONS = [
  { label: '2023-24', caption: 'Chelsea, 2,618 min' },
  { label: '2024-25', caption: 'Chelsea, 3,190 min' },
  { label: '2025-26', caption: 'Chelsea, 2,412 min' },
  { label: '2026-27', caption: 'Chelsea, 886 min' },
];

const ROWS: SeasonTrendRow[] = [
  {
    key: 'ga',
    label: 'Non-penalty goals and assists',
    unit: 'per90',
    points: [
      { value: 0.83, percentile: 97 },
      { value: 0.71, percentile: 94 },
      { value: 0.58, percentile: 86 },
      { value: 0.66, percentile: 91 },
    ],
  },
  {
    key: 'key',
    label: 'Key passes',
    unit: 'per90',
    points: [
      { value: 2.48, percentile: 93 },
      { value: 2.1, percentile: 88 },
      { value: 1.84, percentile: 79 },
      { value: 2.26, percentile: 90 },
    ],
  },
  {
    key: 'drp',
    label: 'Dribble success %',
    unit: 'percent',
    points: [
      { value: 48, percentile: 41 },
      { value: 52, percentile: 55 },
      { value: 44, percentile: 30 },
      { value: 58, percentile: 76 },
    ],
  },
];

const meta = {
  title: 'Stats/SeasonTrend',
  component: SeasonTrend,
  parameters: { layout: 'padded', backgrounds: { default: 'dark' } },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ background: '#151515', padding: 20, maxWidth: 900 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SeasonTrend>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { seasons: SEASONS, rows: ROWS },
  play: async ({ canvasElement }) => {
    const points = canvasElement.querySelectorAll('[data-slot="season-trend-point"]');
    expect(points.length).toBe(12);
    expect(canvasElement.textContent).toContain('0.83');
    expect(canvasElement.textContent).toContain('58%');
    const table = canvasElement.querySelector('table');
    expect(table?.textContent).toContain('0.83 per 90, 97th percentile');
  },
};

/** A season ranked in no group shows its value on a hollow point under the scale, with no line through it. */
export const UnrankedSeason: Story = {
  name: 'A season with no ranking is hollow and breaks the line',
  args: {
    seasons: SEASONS,
    rows: [
      {
        key: 'ga',
        label: 'Non-penalty goals and assists',
        unit: 'per90',
        points: [
          { value: 0.83, percentile: 97 },
          { value: 0.71, percentile: null },
          { value: 0.58, percentile: 86 },
          { value: 0.66, percentile: 91 },
        ],
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const ranked = canvasElement.querySelectorAll('[data-slot="season-trend-point"][data-ranked]');
    expect(ranked.length).toBe(3);
    expect(canvasElement.querySelectorAll('[data-slot="season-trend-line"]').length).toBe(1);
    expect(canvasElement.querySelector('table')?.textContent).toContain('0.71 per 90, not ranked');
  },
};

/** Values only (no percentiles at all): every point hollow, no lines. */
export const ValuesOnly: Story = {
  args: {
    seasons: SEASONS,
    rows: [
      {
        key: 'key',
        label: 'Key passes',
        unit: 'per90',
        points: SEASONS.map((_, i) => ({
          value: [2.48, 2.1, 1.84, 2.26][i] ?? null,
          percentile: null,
        })),
      },
    ],
  },
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelectorAll('[data-slot="season-trend-line"]').length).toBe(0);
    expect(canvasElement.querySelectorAll('[data-ranked]').length).toBe(0);
  },
};

const SEVEN = [
  { label: '2020-21', caption: 'Man City, 64 min' },
  { label: '2021-22', caption: 'Man City, 391 min' },
  { label: '2022-23', caption: 'Man City, 512 min' },
  ...SEASONS,
];

/** More than five seasons scroll inside the chart and open on the newest; the page never scrolls sideways. */
export const ManySeasons: Story = {
  name: 'More than five seasons scroll inside the chart, newest in view',
  args: {
    seasons: SEVEN,
    rows: ROWS.slice(0, 2).map((row) => ({
      ...row,
      points: [
        { value: 0.2, percentile: null },
        { value: 0.41, percentile: 52 },
        { value: 0.55, percentile: 70 },
        ...row.points,
      ],
    })),
  },
  play: async ({ canvasElement }) => {
    const scroller = canvasElement.querySelector(
      '[data-slot="season-trend-scroll"]'
    ) as HTMLElement;
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    await waitFor(() =>
      expect(scroller.scrollLeft + scroller.clientWidth).toBeGreaterThanOrEqual(
        scroller.scrollWidth - 1
      )
    );
  },
};

/** At 390 px, four seasons share the width: nothing overflows the chart. */
export const Phone: Story = {
  args: { seasons: SEASONS, rows: ROWS },
  decorators: [
    (Story) => (
      <div style={{ width: 318 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const figure = canvasElement.querySelector('[data-slot="season-trend"]') as HTMLElement;
    expect(figure.scrollWidth).toBeLessThanOrEqual(figure.clientWidth);
  },
};

/** The visually hidden table never widens its host: a table ignores the 1 px clip, so it sits in a clipped wrapper. */
export const HiddenTableStaysClipped: Story = {
  name: 'The hidden table never widens the page',
  args: { seasons: SEASONS, rows: ROWS },
  decorators: [
    (Story) => (
      <div style={{ width: 318, overflow: 'visible' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const table = canvasElement.querySelector('table') as HTMLElement;
    const clip = table.parentElement as HTMLElement;
    expect(clip.getBoundingClientRect().width).toBeLessThanOrEqual(1);
    expect(getComputedStyle(clip).overflow).toBe('hidden');
  },
};
