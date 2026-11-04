import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { PercentileWheel, type PercentileWheelProps } from './percentile-wheel';
import type { StatMetric } from './stat-metric';
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

function fmt(v: number | null, unit: StatMetric['unit']) {
  if (v === null) return '';
  return unit === 'percent' ? `${Math.round(v)}%` : v.toFixed(2);
}

/**
 * A plain readout above the wheel, as the Stats panel shows one. The readout
 * is the live region (spec §4.2), so the wheel's own is off.
 */
function Panel(props: PercentileWheelProps & { width?: number }) {
  const { width = 720, ...wheel } = props;
  const [key, setKey] = useState<string | null>(null);
  const m = wheel.metrics.find((x) => x.key === key);
  let line = '';
  if (m && (m.state === 'pending' || m.state === 'locked')) line = `${m.label}, event data`;
  else if (m && m.percentile !== null) {
    line = `${m.label} ${fmt(m.value, m.unit)}, ${ordinal(m.percentile)} percentile, median ${fmt(m.median, m.unit)}`;
    const c = wheel.comparison?.percentiles[m.key];
    if (wheel.comparison && c != null) line += `. ${wheel.comparison.name}, ${ordinal(c)}`;
  }
  return (
    <div style={{ background: '#151515', padding: 16, width, boxSizing: 'border-box' }}>
      <div
        data-testid="readout"
        aria-live="polite"
        style={{ minHeight: 20, fontSize: 14, color: '#fff', fontFamily: 'Inter, sans-serif' }}
      >
        {line}
      </div>
      <PercentileWheel
        announce={false}
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

const EVENT_KEYS = ['npxg', 'tib', 'xa', 'sca', 'ppa', 'prgp', 'f3', 'prgc'];

/** Event wedges: dashed, no number, and the readout says "event data". */
async function checkEventWedges(canvasElement: HTMLElement, state: 'pending' | 'locked') {
  const canvas = within(canvasElement);
  const dashed = canvasElement.querySelectorAll(`.btl-pw-slc[data-state="${state}"]`);
  await expect(dashed.length).toBe(8);
  for (const el of dashed) {
    await expect(el.getAttribute('stroke-dasharray')).toBe('3 3');
    await expect(getComputedStyle(el).fill).toBe('none');
  }
  for (const k of EVENT_KEYS) {
    await expect(canvasElement.querySelector(`.btl-pw-tip[data-k="${k}"]`)).toBeNull();
    await expect(canvasElement.querySelector(`.btl-pw-ovl[data-k="${k}"]`)).toBeNull();
  }
  await expect(canvasElement.querySelectorAll('.btl-pw-tip').length).toBe(14);
  const hit = canvasElement.querySelector('.btl-pw-hit[data-k="prgp"]')!;
  await userEvent.hover(hit);
  await expect(canvas.getByTestId('readout')).toHaveTextContent('Progressive passes, event data');
  await userEvent.unhover(hit);
}

export const Event: Story = {
  args: { metrics: withEventMetrics('pending') },
  play: ({ canvasElement }) => checkEventWedges(canvasElement, 'pending'),
};

export const Locked: Story = {
  args: { metrics: withEventMetrics('locked') },
  play: ({ canvasElement }) => checkEventWedges(canvasElement, 'locked'),
};

/** The 22-metric event wheel at phone width: no two short labels overlap. */
export const EventNarrow: Story = {
  args: { metrics: withEventMetrics('pending'), labels: 'short' },
  render: (args) => <Panel {...args} width={358} />,
  play: async ({ canvasElement }) => {
    const labels = [...canvasElement.querySelectorAll<SVGTextElement>('.btl-pw-labs')];
    await expect(labels.length).toBe(22);
    const boxes = labels.map((el) => ({ k: el.dataset.k, b: el.getBBox() }));
    const clashes: string[] = [];
    boxes.forEach(({ k, b }, i) => {
      for (const o of boxes.slice(i + 1)) {
        const c = o.b;
        if (
          b.x < c.x + c.width &&
          c.x < b.x + b.width &&
          b.y < c.y + c.height &&
          c.y < b.y + b.height
        ) {
          clashes.push(`${k} / ${o.k}`);
        }
      }
      if (b.y < 0 || b.y + b.height > 488 || b.x < 0 || b.x + b.width > 720)
        clashes.push(`${k} outside`);
    });
    await expect(clashes).toEqual([]);
  },
};

/**
 * An archetype's metrics lit (Ball Winner's tackles and interceptions,
 * resolved to wheel keys); hover takes over and hands focus back on leave.
 */
export const Focused: Story = {
  args: { focusKeys: ['tkl', 'int'] },
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('.btl-pw') as HTMLElement;
    const lit = () =>
      [...root.querySelectorAll('.btl-pw-solo.btl-pw-on')].map((el) => el.getAttribute('data-k'));
    await expect(root.classList.contains('btl-pw-focus')).toBe(true);
    await expect(lit()).toEqual(['tkl', 'int']);

    const hit = root.querySelector('.btl-pw-hit[data-k="npg"]')!;
    await userEvent.hover(hit);
    await waitFor(() => expect(lit()).toEqual(['npg']));
    await userEvent.unhover(hit);
    await waitFor(() => expect(lit()).toEqual(['tkl', 'int']));
    await expect(root.classList.contains('btl-pw-focus')).toBe(true);
  },
};

/** The export card: static, long labels at any width, an image with a name, no interaction. */
export const Social: Story = {
  args: { variant: 'social', comparison: COMPARISON },
  render: (args) => (
    <div style={{ background: '#151515', padding: 16, width: 952 }}>
      <PercentileWheel {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('img', { name: 'Percentile wheel for Example Player' })
    ).toBeTruthy();
    await expect(canvas.queryByRole('group')).toBeNull();
    const root = canvasElement.querySelector('.btl-pw') as HTMLElement;
    await expect(root.hasAttribute('tabindex')).toBe(false);
    await expect(root.querySelector('.btl-pw-hit')).toBeNull();
    await expect(root.querySelector('[aria-live]')).toBeNull();
    await expect(root.classList.contains('btl-pw-static')).toBe(true);
    const long = root.querySelector('.btl-pw-lab') as SVGTextElement;
    const short = root.querySelector('.btl-pw-labs') as SVGTextElement;
    await expect(getComputedStyle(long).display).not.toBe('none');
    await expect(getComputedStyle(short).display).toBe('none');
    const slc = root.querySelector('.btl-pw-slc') as SVGPathElement;
    await expect(getComputedStyle(slc).animationName).toBe('none');
    await expect(root.querySelectorAll('.btl-pw-ovl').length).toBe(14);
  },
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
