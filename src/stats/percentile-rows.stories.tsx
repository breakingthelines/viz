import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent } from 'storybook/test';
import { PercentileRows, type PercentileRowsProps } from './percentile-rows';
import type { StatMetric } from './types';

function metric(
  partial: Partial<StatMetric> & { key: string; label: string; group: string }
): StatMetric {
  return {
    shortLabel: partial.label,
    unit: 'per90',
    value: null,
    percentile: null,
    median: null,
    state: 'value',
    ...partial,
  };
}

const GROUPS: PercentileRowsProps['groups'] = [
  {
    name: 'Shooting',
    metrics: [
      metric({
        key: 'npg',
        label: 'Non-penalty goals',
        group: 'Shooting',
        value: 0.42,
        percentile: 91,
        median: 0.18,
      }),
      metric({
        key: 'shots',
        label: 'Shots',
        group: 'Shooting',
        value: 2.1,
        percentile: 64,
        median: 1.6,
      }),
      metric({
        key: 'npxg',
        label: 'npxG',
        group: 'Shooting',
        unit: 'per90',
        state: 'pending',
      }),
    ],
  },
  {
    name: 'Creating',
    metrics: [
      metric({
        key: 'key',
        label: 'Key passes',
        group: 'Creating',
        value: 1.8,
        percentile: 95,
        median: 1.1,
      }),
      metric({
        key: 'ast',
        label: 'Assists',
        group: 'Creating',
        value: 0.1,
        percentile: 48,
        median: 0.14,
      }),
    ],
  },
];

const meta = {
  title: 'Stats/PercentileRows',
  component: PercentileRows,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PercentileRows>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { groups: GROUPS },
};

/**
 * A `pending` (event-only) row renders dashed, muted, with no number and no
 * placeholder copy — not even the mock's own "Event data" text (spec §4.5).
 */
export const VerifyPendingRowHasNoPlaceholderCopy: Story = {
  args: { groups: GROUPS },
  play: async ({ canvasElement }) => {
    const npxgRow = [...canvasElement.querySelectorAll('li')].find((li) =>
      li.textContent?.includes('npxG')
    )!;
    // Exactly the label text, nothing else — no "Event data" or any other caption.
    await expect(npxgRow.textContent?.trim()).toBe('npxG');
    const dashedBar = npxgRow.querySelector('span[style*="dashed"]');
    await expect(dashedBar).not.toBeNull();
  },
};

/** Hovering a row reports its metric key through `onFocus`, and clearing the
 * hover reports `null` — the mechanism that lets a wheel, bars and these
 * rows all highlight the same metric together. */
export const VerifyHoverReportsFocus: Story = {
  args: { groups: GROUPS },
  render: () => {
    const [focused, setFocused] = useState<string[] | null>(null);
    return (
      <div>
        <p data-testid="focus-readout">{focused?.join(',') ?? 'none'}</p>
        <PercentileRows
          groups={GROUPS}
          focusKeys={focused}
          onFocus={(key) => setFocused(key ? [key] : null)}
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const row = [...canvasElement.querySelectorAll('li')].find((li) =>
      li.textContent?.includes('Key passes')
    )!;
    await userEvent.hover(row);
    const readout = canvasElement.querySelector('[data-testid="focus-readout"]')!;
    await expect(readout.textContent).toBe('key');

    await userEvent.unhover(row);
    await expect(readout.textContent).toBe('none');
  },
};
