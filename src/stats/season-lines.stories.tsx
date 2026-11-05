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

/** Geometry matches the mock exactly (`prof/build.py:seasons_chart`): the last season's x lands at 970, inside the viewBox, and the ymax/gridline count match its fixed 0-4 axis. */
export const MockGeometry: Story = {
  name: 'Geometry matches the mock (last point at x=970, ymax=4)',
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
  play: async ({ canvasElement }) => {
    const points = canvasElement.querySelectorAll('[data-slot="season-line"] circle');
    const lastSubjectPoint = points[points.length / 2 - 1];
    expect(
      Number(lastSubjectPoint?.getAttribute('cx')),
      "the last season's point must stay inside the viewBox, not run off its right edge"
    ).toBeCloseTo(970, 0);

    const gridlineLabels = Array.from(canvasElement.querySelectorAll('text')).filter((t) =>
      /^[0-9]+$/.test(t.textContent ?? '')
    );
    expect(gridlineLabels.map((t) => t.textContent)).toEqual(['0', '1', '2', '3', '4']);

    const firstGridline = canvasElement.querySelector('line');
    expect(
      Number(firstGridline?.getAttribute('x1')),
      'gridlines start at the chart edge (PAD_L), not indented to the data span'
    ).toBe(40);
  },
};

/** A per-90-minutes count in the dozens (not a per-90 rate) still gets a readable 4-5 gridline axis instead of one line per unit. */
export const WideScale: Story = {
  name: 'A wider scale still gets about 4-5 gridlines',
  args: {
    seasons: SEASONS,
    series: [{ label: 'Minutes per goal', role: 'subject', values: [48, 55, 60, 62] }],
  },
  play: async ({ canvasElement }) => {
    const gridlines = canvasElement.querySelectorAll('[data-slot="season-lines"] svg > g > line');
    expect(gridlines.length).toBeLessThanOrEqual(6);
    expect(gridlines.length).toBeGreaterThanOrEqual(4);
  },
};

/** `framed` opts into the card chrome; the default renders bare so a host panel does not get a card inside a card (design-anti-slop). */
export const Bare: Story = {
  name: 'Renders bare by default (no framed card)',
  args: {
    seasons: SEASONS,
    series: [{ label: 'Non-penalty goals and assists per 90', role: 'subject', values: [0.73] }],
  },
  play: async ({ canvasElement }) => {
    const figure = canvasElement.querySelector('[data-slot="season-lines"]');
    expect(figure?.className ?? '').not.toContain('border');
  },
};

/** The chart's values are also available as a visually hidden table, so a screen reader under `role="img"` gets more than the chart's one-line label. */
export const AccessibleTable: Story = {
  name: 'Carries a visually hidden table of its values',
  args: {
    seasons: SEASONS,
    series: [
      {
        label: 'Non-penalty goals and assists per 90',
        role: 'subject',
        values: [0.42, 0.61, 0.58, 0.73],
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const table = canvasElement.querySelector('table');
    expect(table, 'the chart carries an accessible table of its own values').toBeTruthy();
    expect(table?.textContent).toContain('2026-27');
    expect(table?.textContent).toContain('0.73');
  },
};
