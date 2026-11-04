import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { PercentileWheel, type PercentileWheelProps } from './percentile-wheel';
import {
  COMPARISON,
  GROUP_ORDER,
  SUBJECT_METRICS,
  withEventMetrics,
} from './percentile-wheel.fixture';

/**
 * Drawn to the approved mock (`scratchpad/prof/wheel2.py`, `wheel()`): the
 * subject's per-90 percentiles against Eredivisie midfielders, a comparison
 * player's outline, and the event-data board's pending wedges.
 */

function ordinal(n: number) {
  const r = n % 100;
  return `${n}${r >= 10 && r <= 20 ? 'th' : (({ 1: 'st', 2: 'nd', 3: 'rd' } as const)[n % 10] ?? 'th')}`;
}

/** A plain readout under the wheel, as the Stats panel shows one. */
function Panel(props: PercentileWheelProps & { width?: number }) {
  const { width = 720, ...wheel } = props;
  const [key, setKey] = useState<string | null>(null);
  const m = wheel.metrics.find((x) => x.key === key);
  let line = '';
  if (m && m.state !== 'value') line = `${m.label}, event data`;
  else if (m && m.percentile !== null) {
    line = `${m.label} ${m.value}, ${ordinal(m.percentile)} percentile, median ${m.median}`;
    const c = wheel.comparison?.percentiles[m.key];
    if (wheel.comparison && c != null) line += `. ${wheel.comparison.name}, ${ordinal(c)}`;
  }
  return (
    <div style={{ background: '#151515', padding: 16, width, boxSizing: 'border-box' }}>
      <div
        data-testid="readout"
        style={{ minHeight: 20, fontSize: 14, color: '#fff', fontFamily: 'Inter, sans-serif' }}
      >
        {line}
      </div>
      <PercentileWheel
        {...wheel}
        onFocus={(k) => {
          setKey(k);
          wheel.onFocus?.(k);
        }}
      />
    </div>
  );
}

const meta = {
  title: 'Stats/PercentileWheel',
  component: PercentileWheel,
  render: (args) => <Panel {...args} />,
  parameters: { layout: 'centered', backgrounds: { default: 'dark' } },
  tags: ['autodocs'],
  args: {
    metrics: SUBJECT_METRICS,
    groupOrder: GROUP_ORDER,
    ariaLabel: 'Percentile wheel for Example Player',
  },
} satisfies Meta<typeof PercentileWheel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Subject: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole('group', { name: 'Percentile wheel for Example Player' });
    const root = group as HTMLElement;

    // Hover a wedge: it stays, the rest dims, the readout follows.
    const hit = root.querySelector('.btl-pw-hit[data-k="key"]')!;
    await userEvent.hover(hit);
    await waitFor(() => expect(root.classList.contains('btl-pw-focus')).toBe(true));
    expect(root.querySelector('.btl-pw-solo[data-k="key"]')!.classList.contains('btl-pw-on')).toBe(
      true
    );
    expect(root.querySelector('.btl-pw-solo[data-k="npg"]')!.classList.contains('btl-pw-on')).toBe(
      false
    );
    await expect(canvas.getByTestId('readout')).toHaveTextContent(
      'Key passes 1.93, 89th percentile'
    );
    await userEvent.unhover(hit);
    await waitFor(() => expect(root.classList.contains('btl-pw-focus')).toBe(false));

    // Keyboard: arrows walk the wedges clockwise from the top, Escape clears.
    root.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByTestId('readout')).toHaveTextContent('Non-penalty goals');
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByTestId('readout')).toHaveTextContent('Shots 1.36');
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    await expect(canvas.getByTestId('readout')).toHaveTextContent('Duel win %');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.getByTestId('readout').textContent).toBe(''));
    expect(root.classList.contains('btl-pw-focus')).toBe(false);
  },
};

export const Compare: Story = {
  args: { comparison: COMPARISON },
  play: async ({ canvasElement }) => {
    const ovl = canvasElement.querySelectorAll('.btl-pw-ovl');
    await expect(ovl.length).toBe(14);
    const sotp = canvasElement.querySelector('.btl-pw-ovl[data-k="sotp"]') as SVGPathElement;
    await expect(getComputedStyle(sotp).fill).toBe('none');
  },
};

export const Event: Story = {
  args: { metrics: withEventMetrics('pending') },
};

export const Locked: Story = {
  args: { metrics: withEventMetrics('locked') },
};

export const Narrow: Story = {
  args: { labels: 'short', comparison: COMPARISON },
  render: (args) => <Panel {...args} width={358} />,
  play: async ({ canvasElement }) => {
    const long = canvasElement.querySelector('.btl-pw-lab') as SVGTextElement;
    const short = canvasElement.querySelector('.btl-pw-labs') as SVGTextElement;
    await expect(getComputedStyle(long).display).toBe('none');
    await expect(getComputedStyle(short).display).not.toBe('none');
    // Tap: a second tap on the same wedge clears it.
    const hit = canvasElement.querySelector('.btl-pw-hit[data-k="npg"]')!;
    await userEvent.pointer({ keys: '[TouchA]', target: hit });
    await waitFor(() =>
      expect(canvasElement.querySelector('.btl-pw')!.classList.contains('btl-pw-focus')).toBe(true)
    );
    await userEvent.pointer({ keys: '[TouchA]', target: hit });
    await waitFor(() =>
      expect(canvasElement.querySelector('.btl-pw')!.classList.contains('btl-pw-focus')).toBe(false)
    );
  },
};
