/**
 * Percentile wheel geometry, taken from the approved mock
 * (`scratchpad/prof/wheel2.py`, `wheel()` and its JS `wedge`/`rad`/`P2`).
 * Pure functions, so the server render and the client render agree and a
 * test can compare paths with the mock's own output.
 */

import { interWidth } from './inter-width';
import type { StatMetric } from './stat-metric';

/** The mock's 720 x 488 frame. Only its centre is used now: the view box is fitted to the label rings (`viewBoxFor`). */
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

/**
 * Orders metrics by `groupOrder` (input order inside a group; groups not
 * listed go last, in first-seen order) and lays out the slices.
 *
 * Group gaps are counted from `groupOrder`, as the mock counts its full
 * group list (including Discipline, which is not on the wheel), so passing
 * the same six groups reproduces the mock's angles exactly.
 */
export function layoutWheel(metrics: StatMetric[], groupOrder: string[]): WheelSlice[] {
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
  if (n === 0) return [];
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
  return slices;
}

/* ── curved labels ─────────────────────────────────────────────────────── */

/**
 * What each wheel metric is called on the wheel, by registry key. The
 * family name sits on the arc outside, so a rate reads as a plain noun
 * under it: "Accuracy" under Passing, "Win rate" under Defending. A key
 * not listed here uses its `shortLabel`.
 */
export const WHEEL_LABELS: Readonly<Record<string, string>> = {
  npg: 'Goals',
  shots: 'Shots',
  sotp: 'On target',
  ast: 'Assists',
  key: 'Key passes',
  passes: 'Passes',
  acc: 'Accuracy',
  drs: 'Dribbles',
  drp: 'Success',
  fd: 'Fouled',
  tkl: 'Tackles',
  int: 'Interceptions',
  dw: 'Duels',
  dwp: 'Win rate',
};

/** Label sizes for one width, in view box units. */
export interface WheelLabelStyle {
  /** Metric label size and weight. */
  size: number;
  weight: 500 | 600;
  /** Space between the wheel's outer edge and the label band. */
  gap: number;
  /** Family name size and weight, and the space between the label band and the family arc. */
  family: number;
  familyWeight: 400 | 500;
  familyGap: number;
  /** Family arc stroke width. */
  line: number;
}

/**
 * Desktop: the wheel renders at its view box size, so these are pixels.
 * 12.5 is the size the horizontal labels had before the curved ones.
 */
export const WIDE_LABELS: WheelLabelStyle = {
  size: 12.5,
  weight: 500,
  gap: 9,
  family: 11.5,
  familyWeight: 500,
  familyGap: 8,
  line: 1,
};

/**
 * Phones (760 px and below): the view box shrinks to the column, about
 * 0.64 at a 390 px phone (a 316 px wheel), so 15 renders near 9.5 px and the
 * family names near 9.2 px. At 17 "Tackles" and "Interceptions", the
 * tightest pair, touched; at 15 they keep `MIN_LABEL_GAP_EM` apart.
 */
export const NARROW_LABELS: WheelLabelStyle = {
  size: 15,
  weight: 600,
  gap: 9,
  family: 14.5,
  familyWeight: 500,
  familyGap: 9,
  line: 1.5,
};

/**
 * Smallest space between two neighbouring labels, as a fraction of the label
 * size. Measured where it is smallest (the band's inner edge), on widths with
 * `WIDTH_SLACK` and at the focused weight, so the drawn gap is wider: about
 * 0.8 em between "Tackles" and "Interceptions" on a phone.
 */
export const MIN_LABEL_GAP_EM = 0.5;
/** Space kept clear between the view box edge and the family arc text. */
const VIEW_PAD = 6;

export interface CurvedLabel {
  key: string;
  text: string;
  /** Centre angle: the wedge's middle. */
  am: number;
  /** Baseline radius. */
  r: number;
  /** Bottom half: the text runs counter-clockwise so it reads left to right. */
  flip: boolean;
  /** Text width, and the angle (degrees) it spans at its baseline. */
  width: number;
  span: number;
  /** The textPath arc. */
  path: string;
}

export interface FamilyArc {
  name: string;
  /** Arc from the family's first wedge edge to its last. */
  a0: number;
  a1: number;
  /** Line radius. */
  r: number;
  /** The rule either side of the name, or the whole arc when the name does not fit. */
  lines: string[];
  /** The name's textPath arc; null when the name does not fit its arc. */
  path: string | null;
}

export interface LabelRing {
  style: WheelLabelStyle;
  /** The label size after fitting; the style's own size unless the wheel is crowded. */
  size: number;
  /** Inner edge of the label band. */
  inner: number;
  labels: CurvedLabel[];
  families: FamilyArc[];
  /** Distance from the wheel centre to the outermost drawn text. */
  extent: number;
}

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
/** Clockwise angle from `a` to `b`, in [0, 360). */
const cw = (a: number, b: number) => (((b - a) % 360) + 360) % 360;
/** Below the horizontal centre line (SVG y down). A label exactly on it reads top to bottom. */
const isBottom = (a: number) => Math.sin(rad(a)) > 1e-9;

/** An arc through angle `a` at radius `r`, 160 degrees long, running so the text reads upright. */
export function textArc(a: number, r: number, flip: boolean): string {
  const span = 80;
  const [x0, y0] = polar(r, flip ? a + span : a - span);
  const [x1, y1] = polar(r, flip ? a - span : a + span);
  return `M${f1(x0)},${f1(y0)} A${f1(r)},${f1(r)} 0 0 ${flip ? 0 : 1} ${f1(x1)},${f1(y1)}`;
}

/** A plain clockwise arc from `a0` to `a1` at radius `r`. */
function arc(r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  return `M${f1(x0)},${f1(y0)} A${f1(r)},${f1(r)} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f1(x1)},${f1(y1)}`;
}

/** The words a metric can show on the wheel, longest first. */
function wheelWords(m: StatMetric): string[] {
  const word = WHEEL_LABELS[m.key];
  return word && word !== m.shortLabel ? [word, m.shortLabel] : [m.shortLabel];
}

function placeLabels(
  slices: WheelSlice[],
  words: string[][],
  pick: number[],
  size: number,
  style: WheelLabelStyle
): CurvedLabel[] {
  const inner = OUTER_RADIUS + style.gap;
  return slices.map((s, i) => {
    const flip = isBottom(s.am);
    const r = inner + (flip ? 0.73 : 0.21) * size;
    const text = words[i][pick[i]];
    // Measured at weight 600 whatever the style's weight: a focused label is drawn at 600.
    const width = interWidth(text, size, 600);
    return {
      key: s.metric.key,
      text,
      am: s.am,
      r,
      flip,
      width,
      span: deg(width / r),
      path: textArc(s.am, r, flip),
    };
  });
}

/**
 * Space between each label and the next one clockwise, in view box units,
 * measured at the label band's inner edge (where the angle between two
 * labels is shortest). Empty for fewer than two labels.
 */
export function labelGaps(labels: CurvedLabel[], inner: number): number[] {
  if (labels.length < 2) return [];
  return labels.map((L, i) => {
    const next = labels[(i + 1) % labels.length];
    return rad(cw(L.am, next.am) - L.span / 2 - next.span / 2) * inner;
  });
}

/**
 * Curved labels, each centred on its wedge, and the family arcs outside
 * them. A crowded wheel (the 22-metric event board, say) first swaps the
 * wider of two clashing labels to its `shortLabel`, then shrinks every label
 * together, half a unit at a time, until each pair clears `MIN_LABEL_GAP_EM`.
 */
export function layoutLabels(slices: WheelSlice[], style: WheelLabelStyle): LabelRing {
  const inner = OUTER_RADIUS + style.gap;
  const words = slices.map((s) => wheelWords(s.metric));
  const pick = words.map(() => 0);
  let size = style.size;
  let labels = placeLabels(slices, words, pick, size, style);
  for (let round = 0; round < 200; round++) {
    const gaps = labelGaps(labels, inner);
    const at = gaps.findIndex((g) => g < MIN_LABEL_GAP_EM * size - 1e-9);
    if (at < 0) break;
    const pair = [at, (at + 1) % labels.length].sort((x, y) => labels[y].width - labels[x].width);
    const swap = pair.find((i) => pick[i] < words[i].length - 1);
    if (swap !== undefined) pick[swap] += 1;
    // Half-unit steps: Chromium draws text at an odd fractional size wider
    // than the font's advances say, so the measured width would be wrong.
    else if (size > 1) size = Math.ceil(size * 2 - 1) / 2;
    else break;
    labels = placeLabels(slices, words, pick, size, style);
  }

  const labelOuter = inner + 0.94 * size;
  const lineR = labelOuter + style.familyGap + 0.5 * style.family;
  const families: FamilyArc[] = [];
  for (const s of slices) {
    const last = families[families.length - 1];
    if (last && last.name === s.metric.group) last.a1 = s.a1;
    else
      families.push({ name: s.metric.group, a0: s.a0, a1: s.a1, r: lineR, lines: [], path: null });
  }
  for (const f of families) {
    const mid = (f.a0 + f.a1) / 2;
    const flip = isBottom(mid);
    const w = interWidth(f.name, style.family, style.familyWeight);
    // The name plus half its size of clear rule either side.
    const half = deg((w / 2 + style.family * 0.5) / lineR);
    // A name needs a stub of rule either side to read as the family's.
    if (f.name && mid - half - f.a0 >= 2) {
      f.lines = [arc(lineR, f.a0, mid - half), arc(lineR, mid + half, f.a1)];
      f.path = textArc(mid, lineR + (flip ? 0.36 : -0.36) * style.family, flip);
    } else {
      f.lines = [arc(lineR, f.a0, f.a1)];
    }
  }
  return {
    style,
    size,
    inner,
    labels,
    families,
    extent: lineR + 0.5 * Math.max(style.family, style.line),
  };
}

/** A square view box around the wheel centre that holds every ring passed. */
export function viewBoxFor(rings: LabelRing[]): [number, number, number, number] {
  const half = Math.max(OUTER_RADIUS, ...rings.map((r) => r.extent)) + VIEW_PAD;
  return [WHEEL_CX - half, WHEEL_CY - half, 2 * half, 2 * half];
}

/* ── in-wedge numbers ──────────────────────────────────────────────────── */

export interface WheelTip {
  key: string;
  p: number;
  /** Centre of the number. */
  x: number;
  y: number;
  /** Baseline, for a centred `<text>`. */
  baseline: number;
  /** On the wedge colour; otherwise past the tip, drawn with a halo. */
  inside: boolean;
}

/** Number box for `size` px digits: tabular figures are about 0.62 em, the digits 0.72 em tall. */
function tipBox(p: number, size: number) {
  return { w: String(p).length * 0.62 * size, h: 0.72 * size };
}

/** Distance along angle `a` at which a `w` x `h` box's nearest point is `dist` from the centre. */
function boxDistance(a: number, w: number, h: number, dist: number): number {
  const ux = Math.cos(rad(a));
  const uy = Math.sin(rad(a));
  let lo = 0;
  let hi = dist + w + h;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    const dx = Math.max(0, Math.abs(mid * ux) - w / 2);
    const dy = Math.max(0, Math.abs(mid * uy) - h / 2);
    if (Math.hypot(dx, dy) < dist) lo = mid;
    else hi = mid;
  }
  return hi;
}

/**
 * The percentile numbers at `size`. Each starts where `tipPosition` puts it
 * (inside the tip from the 32nd percentile, past it below that), never
 * closer to the centre than the hub disc allows. When two neighbouring
 * numbers would touch, both move out to one shared radius: never in, where
 * the hub and the mark are. A number that ends up past its wedge's tip
 * gets the halo.
 */
export function layoutTips(slices: WheelSlice[], size: number): WheelTip[] {
  const items = slices.flatMap((s) => {
    const m = s.metric;
    if (m.state !== 'value' || m.percentile === null || !Number.isFinite(m.percentile)) return [];
    const p = Math.round(m.percentile);
    const { w, h } = tipBox(p, size);
    const natural = p >= INSIDE_FROM ? radiusFor(p) - 14 : radiusFor(p) + 12;
    const hub = boxDistance(s.am, w, h, INNER_RADIUS + 3);
    return [{ key: m.key, am: s.am, p, w, h, r: Math.max(natural, hub) }];
  });
  type Item = (typeof items)[number];
  const centre = (it: Item) => polar(it.r, it.am);
  const pad = size * 0.5;
  const touch = (A: Item, B: Item) => {
    const [ax, ay] = centre(A);
    const [bx, by] = centre(B);
    return (
      Math.abs(ax - bx) * 2 < A.w + B.w + 2 * pad && Math.abs(ay - by) * 2 < A.h + B.h + 2 * pad
    );
  };
  const n = items.length;
  for (let round = 0; round < 400 && n > 1; round++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      const A = items[i];
      const B = items[(i + 1) % n];
      if (A === B || !touch(A, B)) continue;
      moved = true;
      const r = Math.max(A.r, B.r) + (A.r === B.r ? 1 : 0);
      A.r = r;
      B.r = r;
    }
    if (!moved) break;
  }
  return items.map((it) => {
    const [x, y] = centre(it);
    return {
      key: it.key,
      p: it.p,
      x,
      y,
      baseline: y + 0.36 * size,
      inside: it.r + it.h / 2 <= radiusFor(it.p) - 1,
    };
  });
}
