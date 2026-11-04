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

/**
 * Exact-colour coverage for the stronger/weaker highlight (mock `.hv b`,
 * `.hr.win-l .hv.l b`, `.hr.win-r .hv.r b`): a stronger left value is flat
 * `#eb0000` even below the 90th percentile ramp threshold, a stronger right
 * value stays plain white (the right side never highlights), and a weaker
 * value on either side stays plain white.
 */
export const VerifyStrongerHighlightColours: Story = {
  args: {
    left: { name: 'Subject' },
    right: { name: 'Comparison' },
    rows: [
      {
        key: 'below-90-left-stronger',
        label: 'Below-90th left stronger',
        group: 'Shooting',
        // Left (54th) beats right (30th), both well under the 90th-percentile
        // ramp threshold — the old `ramp(percentile, side)` highlight would
        // render this darker than white, not red.
        left: { value: 0.3, percentile: 54 },
        right: { value: 0.1, percentile: 30 },
        unit: 'per90',
      },
      {
        key: 'right-stronger',
        label: 'Right stronger',
        group: 'Shooting',
        left: { value: 0.1, percentile: 30 },
        right: { value: 0.3, percentile: 72 },
        unit: 'per90',
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const rows = [...canvasElement.querySelectorAll('.btl-cb-row')];

    const belowNinetyLeftStrongerRow = rows.find((row) =>
      row.textContent?.includes('Below-90th left stronger')
    )!;
    const [leftValue1, rightValue1] = [...belowNinetyLeftStrongerRow.querySelectorAll('b')];
    // Left (54th) is stronger here, well below the 90th-percentile ramp
    // threshold — must still be flat #eb0000, not a dim ramped shade.
    await expect(leftValue1!.textContent).toBe('0.30');
    await expect(getComputedStyle(leftValue1!).color).toBe('rgb(235, 0, 0)');
    await expect(rightValue1!.textContent).toBe('0.10');
    await expect(getComputedStyle(rightValue1!).color).toBe('rgb(255, 255, 255)');

    const rightStrongerRow = rows.find((row) => row.textContent?.includes('Right stronger'))!;
    const [leftValue2, rightValue2] = [...rightStrongerRow.querySelectorAll('b')];
    // Right is stronger here (72nd vs 30th) — the right side never
    // highlights, and the weaker left value stays plain white too.
    await expect(leftValue2!.textContent).toBe('0.10');
    await expect(getComputedStyle(leftValue2!).color).toBe('rgb(255, 255, 255)');
    await expect(rightValue2!.textContent).toBe('0.30');
    await expect(getComputedStyle(rightValue2!).color).toBe('rgb(255, 255, 255)');
  },
};

/**
 * Alignment (mock `.h2h .hv` default left, `.h2h .hv.r{text-align:right}`
 * — not present verbatim as a class here, but the same outer-edge layout):
 * the left value column sits flush left and the right value column sits
 * flush right, away from the centre gutter.
 */
export const VerifyValueAlignment: Story = {
  args: {
    left: { name: 'Subject' },
    right: { name: 'Comparison' },
    rows: ROWS,
  },
  play: async ({ canvasElement }) => {
    const row = [...canvasElement.querySelectorAll('.btl-cb-row')][0]!;
    const [leftValueStack, rightValueStack] = [
      row.children[0] as HTMLElement,
      row.children[row.children.length - 1] as HTMLElement,
    ];
    await expect(getComputedStyle(leftValueStack).textAlign).toBe('left');
    await expect(getComputedStyle(rightValueStack).textAlign).toBe('right');
  },
};
