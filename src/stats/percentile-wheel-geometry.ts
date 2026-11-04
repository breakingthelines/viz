/**
 * Percentile wheel geometry, taken from the approved mock
 * (`scratchpad/prof/wheel2.py`, `wheel()` and its JS `wedge`/`rad`/`P2`).
 * Pure functions, so the server render and the client render agree and a
 * test can compare paths with the mock's own output.
 */

import type { StatMetric } from './stat-metric';

export const WHEEL_WIDTH = 720;
export const WHEEL_HEIGHT = 488;
export const WHEEL_CX = WHEEL_WIDTH / 2;
export const WHEEL_CY = WHEEL_HEIGHT / 2;
/** Inner radius: the centre disc holding the mark sits inside this. */
export const INNER_RADIUS = 44;
/** Outer radius: the 100th percentile. */
export const OUTER_RADIUS = 196;
/** Degrees between groups. */
export const GROUP_GAP = 4;
/** Degrees between slices inside a group. */
export const SLICE_GAP = 1.2;
/** Percentile below which a wedge is still drawn at this length, so it stays visible. */
export const RADIUS_FLOOR = 3;
/** At this percentile and above the number sits inside the wedge tip; below it, past the tip with a halo. */
export const INSIDE_FROM = 32;
/** Labels sit on this radius before collision handling. */
export const LABEL_RADIUS = OUTER_RADIUS + 16;
/** Minimum vertical distance between two labels on the same side. */
export const LABEL_SPACING = 16;
/** Hit areas reach this far past the outer radius, so the label region is hoverable too. */
export const HIT_OVERREACH = 30;

const f1 = (n: number) => n.toFixed(1);

/** Point at radius `r`, angle `a` degrees (0 = right, clockwise, SVG y down). */
export function polar(r: number, a: number): [number, number] {
  const t = (a * Math.PI) / 180;
  return [WHEEL_CX + r * Math.cos(t), WHEEL_CY + r * Math.sin(t)];
}

function pt(r: number, a: number): string {
  const [x, y] = polar(r, a);
  return `${f1(x)},${f1(y)}`;
}

/** Annular sector from radius `ri` to `ro`, angles `a0` to `a1`. Same string as the mock. */
export function wedgePath(ri: number, ro: number, a0: number, a1: number): string {
  return (
    `M${pt(ri, a0)} L${pt(ro, a0)} A${f1(ro)},${f1(ro)} 0 0 1 ${pt(ro, a1)} ` +
    `L${pt(ri, a1)} A${f1(ri)},${f1(ri)} 0 0 0 ${pt(ri, a0)} Z`
  );
}

/** Wedge length for a percentile, with the floor that keeps a 0 visible. */
export function radiusFor(p: number): number {
  return INNER_RADIUS + ((OUTER_RADIUS - INNER_RADIUS) * Math.max(p, RADIUS_FLOOR)) / 100;
}

/** Where the percentile number goes for a wedge whose middle angle is `am`. */
export function tipPosition(p: number, am: number): { x: number; y: number; inside: boolean } {
  const inside = p >= INSIDE_FROM;
  const [x, y] = polar(inside ? radiusFor(p) - 14 : radiusFor(p) + 12, am);
  return { x, y: y + 4.5, inside };
}

export interface WheelSlice {
  metric: StatMetric;
  /** Position in the drawn order, used for the animation stagger. */
  index: number;
  /** Drawn wedge angles (slice gap applied). */
  a0: number;
  a1: number;
  /** Middle angle. */
  am: number;
  /** Hit-area angles: the full slot, gaps included. */
  h0: number;
  h1: number;
}

export interface WheelLabel {
  key: string;
  x: number;
  y: number;
  anchor: 'start' | 'end' | 'middle';
}

export interface WheelLayout {
  slices: WheelSlice[];
  labels: WheelLabel[];
}

/**
 * Orders metrics by `groupOrder` (input order inside a group; groups not
 * listed go last, in first-seen order) and lays out slices and labels.
 *
 * Group gaps are counted from `groupOrder`, as the mock counts its full
 * group list (including Discipline, which is not on the wheel), so passing
 * the same six groups reproduces the mock's angles exactly.
 */
export function layoutWheel(metrics: StatMetric[], groupOrder: string[]): WheelLayout {
  const extra: string[] = [];
  for (const m of metrics) {
    if (!groupOrder.includes(m.group) && !extra.includes(m.group)) extra.push(m.group);
  }
  const order = [...groupOrder, ...extra];
  const ordered = metrics
    .map((m, i) => ({ m, i }))
    .sort((x, y) => order.indexOf(x.m.group) - order.indexOf(y.m.group) || x.i - y.i)
    .map((x) => x.m);

  const n = ordered.length;
  if (n === 0) return { slices: [], labels: [] };
  const span = (360 - order.length * GROUP_GAP) / n;

  const slices: WheelSlice[] = [];
  let a = -90 + GROUP_GAP / 2;
  let last: string | null = null;
  ordered.forEach((metric, index) => {
    if (last !== null && metric.group !== last) a += GROUP_GAP;
    last = metric.group;
    const a0 = a + SLICE_GAP / 2;
    const a1 = a + span - SLICE_GAP / 2;
    slices.push({ metric, index, a0, a1, am: (a0 + a1) / 2, h0: a, h1: a + span });
    a += span;
  });

  const placed = slices.map((s) => {
    const [x, y] = polar(LABEL_RADIUS, s.am);
    const c = Math.cos((s.am * Math.PI) / 180);
    const side: 'r' | 'l' | 'm' = c > 0.08 ? 'r' : c < -0.08 ? 'l' : 'm';
    const dy = side === 'm' ? 8 * Math.sin((s.am * Math.PI) / 180) : 0;
    return { key: s.metric.key, x, y: y + 4 + dy, side };
  });
  for (const side of ['r', 'l'] as const) {
    const column = placed.filter((L) => L.side === side).sort((p, q) => p.y - q.y);
    for (let j = 1; j < column.length; j++) {
      if (column[j].y - column[j - 1].y < LABEL_SPACING) {
        column[j].y = column[j - 1].y + LABEL_SPACING;
      }
    }
  }
  const anchor = { r: 'start', l: 'end', m: 'middle' } as const;
  return {
    slices,
    labels: placed.map(({ key, x, y, side }) => ({ key, x, y, anchor: anchor[side] })),
  };
}
