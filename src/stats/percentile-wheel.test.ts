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
  MIN_LABEL_GAP_EM,
  NARROW_LABELS,
  OUTER_RADIUS,
  WHEEL_CX,
  WHEEL_CY,
  WHEEL_LABELS,
  WIDE_LABELS,
  labelGaps,
  layoutLabels,
  layoutTips,
  layoutWheel,
  radiusFor,
  tipPosition,
  viewBoxFor,
  wedgePath,
  type WheelLabelStyle,
} from './percentile-wheel-geometry';
import goldenJson from './percentile-wheel.golden.json';
import type { StatMetric } from './stat-metric';

// `golden` holds the approved mock's own SVG output (`scratchpad/prof/wheel2.py`,
// `wheel(False)` and `wheel(True)`), parsed into paths and positions per
// metric: the wheel must draw the same shapes in the same places. `curved`
// pins the curved label layout (text, centre angle, baseline radius, flip)
// and the family arcs, at both label sizes.

type CurvedGolden = {
  size: number;
  labels: Record<string, [string, string, string, boolean]>;
  families: [string, string, string, boolean][];
};
interface Golden {
  slc: Record<string, string>;
  tip: Record<string, [string, string, boolean, string]>;
  hit: Record<string, string>;
  track: string[];
  fills: Record<string, string>;
  curved: { wide: CurvedGolden; narrow: CurvedGolden };
}
const golden = goldenJson as unknown as { subject: Golden; event: Golden };

/** The families the live player-outfield template puts on the wheel (no Discipline). */
const FAMILIES = ['Shooting', 'Creating', 'Passing', 'Carrying', 'Defending'];

function checkAgainstMock(g: Golden, metrics: typeof SUBJECT_METRICS) {
  const slices = layoutWheel(metrics, GROUP_ORDER);
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
  for (const [name, style] of [
    ['wide', WIDE_LABELS],
    ['narrow', NARROW_LABELS],
  ] as const) {
    const ring = layoutLabels(slices, style);
    const want = g.curved[name];
    expect(Number(ring.size.toFixed(2)), name).toBe(want.size);
    for (const L of ring.labels) {
      expect([L.text, L.am.toFixed(2), L.r.toFixed(1), L.flip], `${name} ${L.key}`).toEqual(
        want.labels[L.key]
      );
    }
    expect(
      ring.families.map((f) => [f.name, f.a0.toFixed(2), f.a1.toFixed(2), f.path !== null])
    ).toEqual(want.families);
  }
}

describe('percentile wheel geometry', () => {
  it('matches the mock for the subject wheel', () => {
    checkAgainstMock(golden.subject, SUBJECT_METRICS);
  });

  it('matches the mock with event wedges', () => {
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
    const keys = layoutWheel(shuffled, GROUP_ORDER).map((s) => s.metric.key);
    expect(keys.slice(0, 3)).toEqual(['sotp', 'shots', 'npg']);
    expect(keys.at(-1)).toBe('tkl');
  });

  it('handles no metrics', () => {
    expect(layoutWheel([], GROUP_ORDER)).toEqual([]);
    const ring = layoutLabels([], WIDE_LABELS);
    expect(ring.labels).toEqual([]);
    expect(ring.families).toEqual([]);
  });
});

const STYLES: [string, WheelLabelStyle][] = [
  ['desktop', WIDE_LABELS],
  ['phone', NARROW_LABELS],
];

/** Keys whose label is wider than its own wedge. */
function overflow(metrics: StatMetric[], groups: string[], style: WheelLabelStyle) {
  const slices = layoutWheel(metrics, groups);
  const ring = layoutLabels(slices, style);
  // More than half a degree wider than the wedge it is centred on.
  return ring.labels.filter((L, i) => L.span > slices[i].a1 - slices[i].a0 + 0.5).map((L) => L.key);
}

describe('curved labels', () => {
  it('names the wheel metrics in plain words, the families carrying the noun', () => {
    for (const [, style] of STYLES) {
      const ring = layoutLabels(layoutWheel(SUBJECT_METRICS, FAMILIES), style);
      expect(ring.size).toBe(style.size);
      expect(ring.labels.map((L) => L.text)).toEqual([
        'Goals',
        'Shots',
        'On target',
        'Assists',
        'Key passes',
        'Passes',
        'Accuracy',
        'Dribbles',
        'Success',
        'Fouled',
        'Tackles',
        'Interceptions',
        'Duels',
        'Win rate',
      ]);
      expect(ring.labels.map((L) => L.text)).toEqual(
        SUBJECT_METRICS.map((m) => WHEEL_LABELS[m.key])
      );
    }
  });

  it('falls back to the short label for a key it has no word for', () => {
    const m: StatMetric = { ...SUBJECT_METRICS[0], key: 'xg', shortLabel: 'xG' };
    const ring = layoutLabels(layoutWheel([m], ['Shooting']), WIDE_LABELS);
    expect(ring.labels[0].text).toBe('xG');
  });

  // The owner's call on the curved-label prototype: the labels touched. Each
  // label is centred on its wedge; this checks the arc every label takes up
  // fits inside its wedge, or inside what its neighbours leave free, with
  // at least MIN_LABEL_GAP_EM of clear space to the label either side.
  it('fits every label inside its wedge with a clear gap to its neighbours', () => {
    for (const groups of [FAMILIES, GROUP_ORDER]) {
      for (const [name, style] of STYLES) {
        const ring = layoutLabels(layoutWheel(SUBJECT_METRICS, groups), style);
        const gaps = labelGaps(ring.labels, ring.inner);
        expect(gaps).toHaveLength(14);
        for (const [i, g] of gaps.entries()) {
          const pair = `${name}: ${ring.labels[i].text} / ${ring.labels[(i + 1) % 14].text}`;
          expect(g, pair).toBeGreaterThanOrEqual(MIN_LABEL_GAP_EM * style.size);
        }
        // Only "Interceptions" on a phone is wider than its own wedge: it
        // takes some of the room "Tackles" and "Duels" leave free.
        expect(overflow(SUBJECT_METRICS, groups, style), name).toEqual(
          name === 'phone' ? ['int'] : []
        );
      }
    }
  });

  it('leaves at least 5 px between neighbours on a 390 px phone and 15 px on desktop', () => {
    const slices = layoutWheel(SUBJECT_METRICS, FAMILIES);
    const wide = layoutLabels(slices, WIDE_LABELS);
    const narrow = layoutLabels(slices, NARROW_LABELS);
    const [, , vbWidth] = viewBoxFor([wide, narrow]);
    // The Stats tab's wheel is 316 px wide on a 390 px phone; on desktop it
    // is drawn at its view box size.
    const phone = 316 / vbWidth;
    expect(Math.min(...labelGaps(narrow.labels, narrow.inner)) * phone).toBeGreaterThan(5);
    expect(Math.min(...labelGaps(wide.labels, wide.inner))).toBeGreaterThan(15);
    // Label sizes as rendered: 9.5 px on the phone, 12.5 px on desktop.
    expect(NARROW_LABELS.size * phone).toBeCloseTo(9.5, 1);
    expect(NARROW_LABELS.family * phone).toBeGreaterThan(9);
  });

  it('keeps a crowded wheel clear by swapping to short labels, then shrinking', () => {
    const metrics = withEventMetrics('pending');
    for (const [, style] of STYLES) {
      const ring = layoutLabels(layoutWheel(metrics, GROUP_ORDER), style);
      for (const g of labelGaps(ring.labels, ring.inner)) {
        expect(g).toBeGreaterThanOrEqual(MIN_LABEL_GAP_EM * ring.size - 1e-9);
      }
    }
    const pool = withEventMetrics('pending');
    for (let n = 1; n <= 30; n++) {
      const many = Array.from({ length: n }, (_, i) => ({
        ...pool[i % pool.length],
        key: `k${i}`,
        group: `G${Math.floor(i / 4)}`,
      }));
      const groups = [...new Set(many.map((m) => m.group))];
      for (const [, style] of STYLES) {
        const ring = layoutLabels(layoutWheel(many, groups), style);
        expect(ring.labels).toHaveLength(n);
        for (const g of labelGaps(ring.labels, ring.inner)) {
          expect(g, `${n} metrics`).toBeGreaterThanOrEqual(MIN_LABEL_GAP_EM * ring.size - 1e-9);
        }
      }
    }
  });

  it('turns the bottom half over so it reads left to right', () => {
    const ring = layoutLabels(layoutWheel(SUBJECT_METRICS, FAMILIES), NARROW_LABELS);
    for (const L of ring.labels) {
      expect(L.flip, L.key).toBe(Math.sin((L.am * Math.PI) / 180) > 1e-9);
      // Top: the text runs clockwise (sweep 1); bottom: counter-clockwise (sweep 0).
      expect(L.path, L.key).toMatch(L.flip ? / 0 0 0 / : / 0 0 1 /);
    }
    const flipped = ring.labels.filter((L) => L.flip).map((L) => L.key);
    expect(flipped).toEqual(['ast', 'key', 'passes', 'acc', 'drs', 'drp', 'fd']);
  });

  it('draws one arc per family, named, in wheel order', () => {
    const slices = layoutWheel(SUBJECT_METRICS, FAMILIES);
    for (const [, style] of STYLES) {
      const ring = layoutLabels(slices, style);
      expect(ring.families.map((f) => f.name)).toEqual(FAMILIES);
      for (const f of ring.families) {
        const own = slices.filter((s) => s.metric.group === f.name);
        expect(f.a0).toBe(own[0].a0);
        expect(f.a1).toBe(own.at(-1)!.a1);
        expect(f.path, f.name).not.toBeNull();
        expect(f.lines, f.name).toHaveLength(2);
        expect(f.r).toBeGreaterThan(ring.inner + ring.size);
      }
    }
  });

  it('draws a family too short for its name as a plain arc', () => {
    const one: StatMetric = { ...SUBJECT_METRICS[0], group: 'An unusually long family name' };
    const slices = layoutWheel([...SUBJECT_METRICS, one], [...FAMILIES, one.group]);
    const ring = layoutLabels(slices, WIDE_LABELS);
    const f = ring.families.at(-1)!;
    expect(f.path).toBeNull();
    expect(f.lines).toHaveLength(1);
  });

  it('fits a square view box to the rings, so a phone draws the wheel larger', () => {
    const slices = layoutWheel(SUBJECT_METRICS, FAMILIES);
    const rings = [layoutLabels(slices, WIDE_LABELS), layoutLabels(slices, NARROW_LABELS)];
    const [x, y, w, h] = viewBoxFor(rings);
    expect(w).toBe(h);
    expect(x + w / 2).toBe(WHEEL_CX);
    expect(y + h / 2).toBe(WHEEL_CY);
    expect(w / 2).toBeGreaterThan(Math.max(...rings.map((r) => r.extent)));
    // The old 720-wide box drew the wheel at 316 / 720 on a phone.
    expect(316 / w).toBeGreaterThan(0.6);
  });
});

/** Percentiles low enough that the numbers bunch up next to the hub. */
function lowDefence(): StatMetric[] {
  const low: Record<string, number> = { tkl: 18, int: 27, dw: 24, dwp: 30 };
  return SUBJECT_METRICS.map((m) => (m.key in low ? { ...m, percentile: low[m.key] } : m));
}

describe('in-wedge numbers', () => {
  it('leaves a number where the mock puts it when nothing is in its way', () => {
    const slices = layoutWheel(SUBJECT_METRICS, GROUP_ORDER);
    const tips = layoutTips(slices, 11);
    for (const key of ['npg', 'sotp', 'key', 'drs', 'tkl']) {
      const t = tips.find((x) => x.key === key)!;
      const s = slices.find((x) => x.metric.key === key)!;
      const want = tipPosition(t.p, s.am);
      expect([t.x.toFixed(1), (t.y + 4.5).toFixed(1), t.inside], key).toEqual([
        want.x.toFixed(1),
        want.y.toFixed(1),
        want.inside,
      ]);
    }
  });

  it('moves neighbouring numbers that collide out to one shared radius, clear of the hub', () => {
    for (const size of [11, 22]) {
      const slices = layoutWheel(lowDefence(), FAMILIES);
      const tips = layoutTips(slices, size);
      const r = (k: string) =>
        Math.hypot(
          tips.find((t) => t.key === k)!.x - WHEEL_CX,
          tips.find((t) => t.key === k)!.y - WHEEL_CY
        );
      // At the phone size "24" (Duels) runs into "30" (Win rate): both go out
      // to the radius "30" already had, never in toward the hub.
      if (size === 22) {
        expect(r('dw')).toBeCloseTo(r('dwp'), 6);
        expect(r('dw')).toBeGreaterThan(tipPosition(24, 0).x - WHEEL_CX);
      }
      for (const t of tips) {
        const w = String(t.p).length * 0.62 * size;
        const h = 0.72 * size;
        // Clear of the hub disc and the mark: the box's nearest corner is outside it.
        const dx = Math.max(0, Math.abs(t.x - WHEEL_CX) - w / 2);
        const dy = Math.max(0, Math.abs(t.y - WHEEL_CY) - h / 2);
        expect(Math.hypot(dx, dy), `${size} ${t.key}`).toBeGreaterThanOrEqual(
          INNER_RADIUS + 3 - 1e-6
        );
        expect(Math.hypot(t.x - WHEEL_CX, t.y - WHEEL_CY)).toBeLessThan(OUTER_RADIUS);
      }
      // No two neighbouring numbers overlap.
      for (let i = 0; i < tips.length; i++) {
        const a = tips[i];
        const b = tips[(i + 1) % tips.length];
        const wa = String(a.p).length * 0.62 * size;
        const wb = String(b.p).length * 0.62 * size;
        const h = 0.72 * size;
        const apart = Math.abs(a.x - b.x) * 2 >= wa + wb || Math.abs(a.y - b.y) * 2 >= 2 * h;
        expect(apart, `${size} ${a.key} / ${b.key}`).toBe(true);
      }
    }
  });

  it('gives a number pushed past its wedge tip the halo', () => {
    const slices = layoutWheel(lowDefence(), FAMILIES);
    const tips = layoutTips(slices, 22);
    for (const t of tips) {
      const r = Math.hypot(t.x - WHEEL_CX, t.y - WHEEL_CY);
      expect(t.inside, t.key).toBe(r + 0.36 * 22 <= radiusFor(t.p) - 1);
    }
    expect(tips.find((t) => t.key === 'tkl')!.inside).toBe(false);
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
    // `auto` carries both label sizes, desktop (`btl-pw-w`) and phone (`btl-pw-n`); CSS shows one.
    expect(count(html, /<g class="btl-pw-w">/g)).toBe(1);
    expect(count(html, /<g class="btl-pw-n">/g)).toBe(1);
    expect(count(html, /class="btl-pw-tip/g)).toBe(28);
    expect(count(html, /class="btl-pw-hit"/g)).toBe(14);
    expect(count(html, /class="btl-pw-lab[ "]/g)).toBe(28);
    expect(count(html, /<textPath /g)).toBe(28 + 10);
    expect(count(html, /data-family="/g)).toBe(10);
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
    expect(html).toContain('<li>Non-penalty goals, 0.57, 85th percentile, median 0.30</li>');
    expect(html).toContain('<li>Shots, 1.36, 11th percentile, median 2.02</li>');
    expect(html).toContain('<li>Shots on target %, 58%, 83rd percentile, median 46%</li>');
    expect(html).toContain('aria-live="polite"');
  });

  it('leaves announcing to the caller when announce is false', () => {
    const html = render({ announce: false });
    expect(html).not.toContain('aria-live');
    expect(html).toContain('<li>Non-penalty goals, 0.57, 85th percentile, median 0.30</li>');
  });

  it('draws each label on its own arc, centred on the wedge', () => {
    const html = render({ labels: 'long' });
    expect(count(html, /class="btl-pw-lab[ "]/g)).toBe(14);
    expect(html).not.toContain('class="btl-pw-n"');
    const slices = layoutWheel(SUBJECT_METRICS, GROUP_ORDER);
    const ring = layoutLabels(slices, WIDE_LABELS);
    for (const L of ring.labels) {
      expect(html).toContain(`d="${L.path}"`);
    }
    // Every textPath points at a path drawn in the same wheel.
    const ids = new Set([...html.matchAll(/<path id="([^"]+)"/g)].map((m) => m[1]));
    const refs = [...html.matchAll(/<textPath href="#([^"]+)"/g)].map((m) => m[1]);
    expect(refs).toHaveLength(14 + 5);
    for (const r of refs) expect(ids.has(r), r).toBe(true);
    expect(html).toMatch(/startOffset="50%">Interceptions<\/textPath>/);
    expect(html).toMatch(/startOffset="50%">Defending<\/textPath>/);
  });

  it('gives two wheels on one page their own arc ids', () => {
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        createElement(PercentileWheel, {
          metrics: SUBJECT_METRICS,
          groupOrder: GROUP_ORDER,
          ariaLabel: 'a',
        }),
        createElement(PercentileWheel, {
          metrics: SUBJECT_METRICS,
          groupOrder: GROUP_ORDER,
          ariaLabel: 'b',
        })
      )
    );
    const ids = [...html.matchAll(/<path id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(2 * 2 * (14 + 5));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sizes the phone labels for the phone and draws the view box square', () => {
    const html = render({ labels: 'short' });
    expect(html).not.toContain('class="btl-pw-w"');
    expect(html).toMatch(/class="btl-pw-lab" data-k="npg" font-size="15" font-weight="600"/);
    const [x, y, w, h] = html
      .match(/viewBox="([^"]+)"/)![1]
      .split(' ')
      .map(Number);
    expect(w).toBe(h);
    expect(x + w / 2).toBeCloseTo(WHEEL_CX, 0);
    expect(y + h / 2).toBeCloseTo(WHEEL_CY, 0);
    expect(w).toBeLessThan(510);
  });

  it('draws the comparison as white-ramp outlines with its percentile in the text alternative', () => {
    const html = render({ comparison: COMPARISON });
    expect(count(html, /class="btl-pw-ovl/g)).toBe(14);
    expect(html).toContain(`stroke:${ramp(97, 'comparison')}`);
    expect(html).toContain(
      '<li>Shots on target %, 58%, 83rd percentile, median 46%; Comparison Player, 97th</li>'
    );
    const slices = layoutWheel(SUBJECT_METRICS, GROUP_ORDER);
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
      expect(count(html, /class="btl-pw-tip/g)).toBe(28);
      expect(html).toContain('<li>Progressive passes, event data</li>');
    }
  });

  it('dims everything but the focused metrics', () => {
    const html = render({ focusKeys: ['npg', 'key'] });
    expect(html).toMatch(/class="btl-pw btl-pw-auto btl-pw-focus"/);
    expect(count(html, /btl-pw-slc btl-pw-solo btl-pw-dm btl-pw-on/g)).toBe(2);
  });

  it('takes focus keys already resolved through the registry focus_key', () => {
    // Ball Winner weights tkl_padj and int_padj; the registry's focus_key
    // resolves them to tkl and int, which are the wheel's keys.
    const html = render({ focusKeys: ['tkl', 'int'] });
    expect(count(html, /btl-pw-solo btl-pw-dm btl-pw-on/g)).toBe(2);
    expect(html).toMatch(/class="btl-pw-slc btl-pw-solo btl-pw-dm btl-pw-on" data-k="tkl"/);
  });

  it('lights a variant through its focusKey, in the registry direction', () => {
    const variant: StatMetric = {
      ...SUBJECT_METRICS.find((m) => m.key === 'tkl')!,
      key: 'tkl_padj',
      label: 'Tackles, possession adjusted',
      group: 'Admin',
      focusKey: 'tkl',
    };
    const html = render({ metrics: [...SUBJECT_METRICS, variant], focusKeys: ['tkl'] });
    expect(html).toMatch(/btl-pw-on" data-k="tkl"/);
    expect(html).toMatch(/btl-pw-on" data-k="tkl_padj"/);
  });

  it('dims nothing when no focus key is on the wheel', () => {
    for (const focusKeys of [
      ['tkl_padj', 'int_padj'],
      ['aerials', 'aerial_pct'],
    ]) {
      const html = render({ focusKeys });
      expect(html).toMatch(/<div class="btl-pw btl-pw-auto"/);
      expect(html).not.toMatch(/class="[^"]*btl-pw-on/);
    }
  });

  it('switches label sets and motion by class', () => {
    expect(render({ labels: 'short' })).toContain('btl-pw btl-pw-short');
    expect(render()).toContain('.btl-pw.btl-pw-auto .btl-pw-n{display:inline}');
    expect(render({ animate: false })).toContain('btl-pw-static');
    expect(render()).toContain('@media (prefers-reduced-motion:reduce)');
    expect(render()).toContain('@media (max-width:760px)');
  });

  describe('tip size (PF-polish wheel numbers)', () => {
    /** The tip font sizes in one label layer (`w` desktop, `n` phone). */
    const tipSizes = (html: string, layer: 'w' | 'n') => {
      const part =
        html.split(`<g class="btl-pw-${layer}">`)[1]?.split('<g class="btl-pw-')[0] ?? '';
      return [
        ...part.matchAll(/class="btl-pw-tip[^"]*"[^>]*font-size="([^"]+)" font-weight="700"/g),
      ].map((m) => Number(m[1]));
    };

    it('defaults the in-wedge number to 11, weight 700, down from the shipped 13', () => {
      const html = render();
      expect(html).toMatch(/class="btl-pw-tip btl-pw-dm"[^>]*font-size="11"[^>]*font-weight="700"/);
      expect(tipSizes(html, 'w')).toEqual(Array(14).fill(11));
    });

    it('takes a tipSize prop and renders it on every desktop tip, at weight 700', () => {
      const html = render({ tipSize: 9, labels: 'long' });
      // 14 value metrics in SUBJECT_METRICS (see `render` server-render tests above).
      expect(count(html, /font-size="9" font-weight="700"/g)).toBe(14);
      expect(html).not.toContain('font-size="11"');
    });

    it('keeps the narrow (<=760px) tip at its 22 px ratio for a tipSize at or above the shipped 13', () => {
      // 20 * (22/13) = 33.8..., above the 22 px floor, so the ratio applies.
      const html = render({ tipSize: 20 });
      expect(tipSizes(html, 'n')).toEqual(Array(14).fill(33.84615384615385));
      expect(tipSizes(render({ tipSize: 20, labels: 'short' }), 'n')).toHaveLength(14);
    });

    it('floors the narrow (<=760px) tip at 22px, so a small tipSize cannot shrink it past legibility', () => {
      for (const tipSize of [11, 9, 4]) {
        expect(tipSizes(render({ tipSize }), 'n'), `tipSize ${tipSize}`).toEqual(
          Array(14).fill(22)
        );
      }
    });
  });

  it('renders the social variant static, labelled as an image, with no hit areas', () => {
    const html = render({ variant: 'social' });
    expect(html).toContain('btl-pw-long');
    expect(html).toContain('btl-pw-static');
    // The card draws the desktop labels only.
    expect(html).not.toContain('class="btl-pw-n"');
    expect(count(html, /class="btl-pw-lab[ "]/g)).toBe(14);
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

  it('draws and lists the comparison where the subject has no data', () => {
    const metrics = SUBJECT_METRICS.map((m) =>
      m.key === 'int'
        ? { ...m, value: null, percentile: null, median: null, state: 'no-data' as const }
        : m
    );
    const html = render({ metrics, comparison: COMPARISON });
    expect(count(html, /class="btl-pw-ovl/g)).toBe(14);
    const slice = layoutWheel(metrics, GROUP_ORDER).find((s) => s.metric.key === 'int')!;
    expect(html).toContain(wedgePath(INNER_RADIUS, radiusFor(48), slice.a0, slice.a1));
    expect(html).toContain(`stroke:${ramp(48, 'comparison')}`);
    expect(html).toContain('<li>Interceptions, no data; Comparison Player, 48th</li>');
  });

  it('never draws a comparison outline on an event wedge', () => {
    const html = render({
      metrics: withEventMetrics('pending'),
      comparison: {
        name: 'Comparison Player',
        percentiles: { ...COMPARISON.percentiles, prgp: 70 },
      },
    });
    expect(count(html, /class="btl-pw-ovl/g)).toBe(14);
    expect(html).not.toMatch(/class="btl-pw-ovl[^"]*" data-k="prgp"/);
  });
});
