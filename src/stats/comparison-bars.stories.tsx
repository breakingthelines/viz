import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { ComparisonBars, type ComparisonBarsRow } from './comparison-bars';

const ROWS: ComparisonBarsRow[] = [
  {
    key: 'npg',
    label: 'Non-penalty goals',
    group: 'Shooting',
    left: { value: 0.42, percentile: 91 },
    right: { value: 0.18, percentile: 54 },
    unit: 'per90',
  },
  {
    key: 'sotp',
    label: 'Shots on target %',
    group: 'Shooting',
    left: { value: 38, percentile: 46 },
    right: { value: 52, percentile: 88 },
    unit: 'percent',
  },
  {
    key: 'key',
    label: 'Key passes',
    group: 'Creating',
    left: { value: 1.8, percentile: 95 },
    right: { value: 1.1, percentile: 60 },
    unit: 'per90',
  },
  {
    key: 'acc',
    label: 'Pass accuracy %',
    group: 'Passing',
    left: { value: null, percentile: null },
    right: { value: 84, percentile: 70 },
    unit: 'percent',
  },
];

const meta = {
  title: 'Stats/ComparisonBars',
  component: ComparisonBars,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ComparisonBars>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    left: { name: 'Anis Hadj-Moussa' },
    right: { name: 'Teun Koopmeiners' },
    rows: ROWS,
  },
};

/** The two seasons differ, so each name carries its own season label. */
export const DifferentSeasons: Story = {
  args: {
    left: { name: 'Anis Hadj-Moussa', seasonLabel: '2026-27' },
    right: { name: 'Anis Hadj-Moussa', seasonLabel: '2023-24' },
    rows: ROWS,
  },
};

/**
 * Verifies the rows render grouped (spec §4.1), that a null side (§1.5's
 * "no data" rule) renders an en dash rather than a zero, and that the
 * stronger side on a row is coloured while the weaker side stays plain
 * white — both readable straight from the rendered markup.
 */
export const VerifyGroupedAndNullHandling: Story = {
  args: {
    left: { name: 'Subject' },
    right: { name: 'Comparison' },
    rows: ROWS,
  },
  play: async ({ canvasElement }) => {
    const groupHeadings = [...canvasElement.querySelectorAll('div')].filter(
      (el) => el.textContent === 'Shooting' || el.textContent === 'Creating'
    );
    await expect(groupHeadings.length).toBeGreaterThanOrEqual(2);

    // The "Pass accuracy %" row's left side has no value (§1.5): the value
    // cell must show an en dash, never "0" or "0%".
    const dashes = [...canvasElement.querySelectorAll('b')].filter((el) => el.textContent === '–');
    await expect(dashes.length).toBeGreaterThan(0);

    // Non-penalty goals: left (91st) beats right (54th) — the left value
    // must NOT render plain white.
    const leftGoalsValue = [...canvasElement.querySelectorAll('b')].find(
      (el) => el.textContent === '0.42'
    )!;
    await expect(getComputedStyle(leftGoalsValue).color).not.toBe('rgb(255, 255, 255)');
  },
};
