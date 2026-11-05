import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import { PercentileRows, type PercentileRowsProps } from './percentile-rows';
import type { StatMetric } from './stat-metric';

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
    a11y: { test: 'error' },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PercentileRows>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { groups: GROUPS },
};

/**
 * A `pending` (event-only) row renders dashed, muted, with no number but
 * WITH the "Event data" state label (spec §4.1, verdict P-D5, mock
 * `per90_table`) — a screen reader needs some indication this row is in a
 * different state from a value row, and "Event data" is the approved
 * wording for it.
 */
export const VerifyPendingRowShowsEventDataLabel: Story = {
  args: { groups: GROUPS },
  play: async ({ canvasElement }) => {
    const npxgRow = [...canvasElement.querySelectorAll('li')].find((li) =>
      li.textContent?.includes('npxG')
    )!;
    await expect(npxgRow.textContent?.trim()).toBe('npxGEvent data');
    const dashedBar = npxgRow.querySelector('span[style*="dashed"]');
    await expect(dashedBar).not.toBeNull();
  },
};

/**
 * A `no-data` row (computed for the competition, absent for this player,
 * spec §1.5) still renders as a value row — a ramp bar at 0 and an en dash
 * for both value and percentile, never a zero and never the pending/locked
 * dashed treatment, which is reserved for event-only metrics.
 */
export const VerifyNoDataRowRendersDashesNotZero: Story = {
  args: {
    groups: [
      {
        name: 'Shooting',
        metrics: [
          {
            key: 'npg',
            label: 'Non-penalty goals',
            shortLabel: 'npG',
            group: 'Shooting',
            unit: 'per90',
            value: null,
            percentile: null,
            median: null,
            state: 'no-data',
          },
        ],
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const row = [...canvasElement.querySelectorAll('li')].find((li) =>
      li.textContent?.includes('Non-penalty goals')
    )!;
    // No "Event data" label — that is reserved for pending/locked rows.
    await expect(row.textContent).not.toContain('Event data');
    const dashes = [...row.querySelectorAll('span')].filter((el) => el.textContent === '–');
    await expect(dashes.length).toBeGreaterThanOrEqual(2);
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

/** Keyboard users reach the same readout: tabbing a row focuses it and
 * reports its key, the same as a hover would (spec §4.3 "tap replaces
 * hover" needs a real focus path, not emulated mouse events). */
export const VerifyKeyboardFocusReportsFocus: Story = {
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
    await expect(row).toHaveAttribute('tabindex', '0');

    row.focus();
    const readout = canvasElement.querySelector('[data-testid="focus-readout"]')!;
    await waitFor(() => expect(readout.textContent).toBe('key'));

    row.blur();
    await waitFor(() => expect(readout.textContent).toBe('none'));
  },
};
