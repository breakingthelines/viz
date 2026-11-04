import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ramp } from '../brand/colour';
import { PercentileWheel, type PercentileWheelProps } from './percentile-wheel';
import {
  COMPARISON,
  GROUP_ORDER,
  SUBJECT_METRICS,
  withEventMetrics,
} from './percentile-wheel.fixture';
import {
  INNER_RADIUS,
  OUTER_RADIUS,
  layoutWheel,
  radiusFor,
  tipPosition,
  wedgePath,
} from './percentile-wheel-geometry';
import goldenJson from './percentile-wheel.golden.json';

// `golden` is the approved mock's own SVG output (`scratchpad/prof/wheel2.py`,
// `wheel(False)` and `wheel(True)`), parsed into paths and positions per
// metric: the wheel must draw the same shapes in the same places.

interface Golden {
  slc: Record<string, string>;
  tip: Record<string, [string, string, boolean, string]>;
  lab: Record<string, [string, string, string]>;
  hit: Record<string, string>;
  track: string[];
  fills: Record<string, string>;
}
const golden = goldenJson as unknown as { subject: Golden; event: Golden };

function checkAgainstMock(g: Golden, metrics: typeof SUBJECT_METRICS) {
  const { slices, labels } = layoutWheel(metrics, GROUP_ORDER);
  const tracks = slices.map((s) => wedgePath(INNER_RADIUS, OUTER_RADIUS, s.a0, s.a1));
  expect(tracks).toEqual(g.track);
  for (const s of slices) {
    const k = s.metric.key;
    const ro = s.metric.state === 'value' ? radiusFor(s.metric.percentile ?? 0) : OUTER_RADIUS;
    expect(wedgePath(INNER_RADIUS, ro, s.a0, s.a1), k).toBe(g.slc[k]);
    expect(wedgePath(INNER_RADIUS, OUTER_RADIUS + 30, s.h0, s.h1), k).toBe(g.hit[k]);
    if (s.metric.state === 'value') {
      const p = s.metric.percentile ?? 0;
      const t = tipPosition(p, s.am);
      const [x, y, halo, text] = g.tip[k];
      expect([t.x.toFixed(1), t.y.toFixed(1), !t.inside, String(p)], k).toEqual([x, y, halo, text]);
      expect(ramp(p, 'subject'), k).toBe(g.fills[k]);
    }
  }
  for (const L of labels) {
    expect([L.x.toFixed(1), L.y.toFixed(1), L.anchor], L.key).toEqual(g.lab[L.key]);
  }
}

describe('percentile wheel geometry', () => {
  it('matches the mock for the subject wheel', () => {
    checkAgainstMock(golden.subject, SUBJECT_METRICS);
  });

  it('matches the mock with event wedges, including label collisions', () => {
    checkAgainstMock(golden.event, withEventMetrics('pending'));
  });

  it('floors short wedges at the 3rd percentile', () => {
    expect(radiusFor(0)).toBe(radiusFor(3));
    expect(radiusFor(100)).toBe(OUTER_RADIUS);
    expect(radiusFor(50)).toBe(120);
  });

  it('puts the number inside from the 32nd percentile and past the tip below it', () => {
    expect(tipPosition(32, 0).inside).toBe(true);
    expect(tipPosition(31, 0).inside).toBe(false);
  });

  it('orders by group and keeps input order inside a group', () => {
    const shuffled = [...SUBJECT_METRICS].reverse();
    const keys = layoutWheel(shuffled, GROUP_ORDER).slices.map((s) => s.metric.key);
    expect(keys.slice(0, 3)).toEqual(['sotp', 'shots', 'npg']);
    expect(keys.at(-1)).toBe('tkl');
  });

  it('separates crowded labels by at least 16 on each side', () => {
    const { labels } = layoutWheel(withEventMetrics('pending'), GROUP_ORDER);
    for (const anchor of ['start', 'end'] as const) {
      const ys = labels
        .filter((l) => l.anchor === anchor)
        .map((l) => l.y)
        .sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(16);
    }
  });

  it('handles no metrics', () => {
    expect(layoutWheel([], GROUP_ORDER)).toEqual({ slices: [], labels: [] });
  });
});

function render(props: Partial<PercentileWheelProps> = {}) {
  return renderToStaticMarkup(
    createElement(PercentileWheel, {
      metrics: SUBJECT_METRICS,
      groupOrder: GROUP_ORDER,
      ariaLabel: 'Percentile wheel for Example Player',
      ...props,
    })
  );
}

function count(html: string, re: RegExp) {
  return html.match(re)?.length ?? 0;
}

describe('PercentileWheel server render', () => {
  it('renders a complete wheel with no effects', () => {
    const html = render();
    expect(count(html, /class="btl-pw-slc btl-pw-solo/g)).toBe(14);
    expect(count(html, /class="btl-pw-tip/g)).toBe(14);
    expect(count(html, /class="btl-pw-hit"/g)).toBe(14);
    expect(count(html, /class="btl-pw-lab[ "]/g)).toBe(14);
    expect(count(html, /class="btl-pw-labs[ "]/g)).toBe(14);
    expect(html).toContain('stroke-dasharray="2 4"');
    expect(html).toContain('data-mark=""');
    expect(html).toContain('fill="#E20613"');
    expect(html).toContain(golden.subject.slc.npg);
  });

  it('is one labelled, keyboard-reachable group with a text alternative', () => {
    const html = render();
    expect(html).toMatch(/role="group" aria-label="Percentile wheel for Example Player"/);
    expect(html).toContain('tabindex="0"');
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html).toContain('<li>Non-penalty goals, 85th percentile</li>');
    expect(html).toContain('<li>Shots, 11th percentile</li>');
    expect(html).toContain('aria-live="polite"');
  });

  it('draws the comparison as white-ramp outlines with its percentile in the text alternative', () => {
    const html = render({ comparison: COMPARISON });
    expect(count(html, /class="btl-pw-ovl/g)).toBe(14);
    expect(html).toContain(`stroke:${ramp(97, 'comparison')}`);
    expect(html).toContain('<li>Shots on target %, 83rd percentile; Comparison Player, 97th</li>');
    const { slices } = layoutWheel(SUBJECT_METRICS, GROUP_ORDER);
    const sotp = slices.find((s) => s.metric.key === 'sotp')!;
    expect(html).toContain(wedgePath(INNER_RADIUS, radiusFor(97), sotp.a0, sotp.a1));
  });

  it('collapses the overlay when there is no comparison', () => {
    const html = render();
    expect(count(html, /stroke:transparent/g)).toBe(14);
  });

  it('draws pending and locked metrics dashed, with no number', () => {
    for (const state of ['pending', 'locked'] as const) {
      const html = render({ metrics: withEventMetrics(state) });
      expect(count(html, new RegExp(`data-state="${state}"`, 'g'))).toBe(8);
      expect(count(html, /stroke-dasharray="3 3"/g)).toBe(8);
      expect(count(html, /class="btl-pw-tip/g)).toBe(14);
      expect(html).toContain('<li>Progressive passes, event data</li>');
    }
  });

  it('dims everything but the focused metrics', () => {
    const html = render({ focusKeys: ['npg', 'key'] });
    expect(html).toMatch(/class="btl-pw btl-pw-auto btl-pw-focus"/);
    expect(count(html, /btl-pw-slc btl-pw-solo btl-pw-dm btl-pw-on/g)).toBe(2);
  });

  it('matches focus through focusKey', () => {
    const metrics = SUBJECT_METRICS.map((m) =>
      m.key === 'tkl' ? { ...m, focusKey: 'tkl_padj' } : m
    );
    const html = render({ metrics, focusKeys: ['tkl_padj'] });
    expect(count(html, /btl-pw-solo btl-pw-dm btl-pw-on/g)).toBe(1);
  });

  it('switches label sets and motion by class', () => {
    expect(render({ labels: 'short' })).toContain('btl-pw btl-pw-short');
    expect(render({ animate: false })).toContain('btl-pw-static');
    expect(render()).toContain('@media (prefers-reduced-motion:reduce)');
    expect(render()).toContain('@media (max-width:760px)');
  });

  it('renders the social variant static, labelled as an image, with no hit areas', () => {
    const html = render({ variant: 'social' });
    expect(html).toContain('btl-pw-long');
    expect(html).toContain('btl-pw-static');
    expect(html).toMatch(
      /<svg[^>]*role="img"[^>]*aria-label="Percentile wheel for Example Player"/
    );
    expect(html).not.toContain('class="btl-pw-hit"');
    expect(html).not.toContain('tabindex');
  });

  it('treats a non-finite percentile as no data', () => {
    const metrics = SUBJECT_METRICS.map((m) =>
      m.key === 'int' ? { ...m, percentile: Number.NaN } : m
    );
    const html = render({ metrics });
    expect(count(html, /class="btl-pw-slc btl-pw-solo/g)).toBe(13);
    expect(html).toContain('<li>Interceptions, no data</li>');
    expect(html).not.toContain('NaN');
  });
});
