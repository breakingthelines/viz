/**
 * The Regista crayon hand (studio `app/features/regista/field.ts`), in SVG: a
 * wobbly line laid twice, the second thinner and offset, roughed up by a grain
 * filter so the edge breaks like wax on paper. Seeded, so a block draws the
 * same marks on every render and in its saved image.
 */

export type Pt = [number, number];

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

/** A stable seed from a string (the block's title and highlight). */
export function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function smooth(q: Pt[]): string {
  let d = `M${q[0][0].toFixed(1)} ${q[0][1].toFixed(1)}`;
  for (let i = 1; i < q.length - 1; i++) {
    const mx = (q[i][0] + q[i + 1][0]) / 2;
    const my = (q[i][1] + q[i + 1][1]) / 2;
    d += ` Q${q[i][0].toFixed(1)} ${q[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const e = q[q.length - 1];
  return `${d} L${e[0].toFixed(1)} ${e[1].toFixed(1)}`;
}

/** A loop that never closes on its own radius: it drifts out as it goes round. */
export function ring(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  from = 0,
  sweep = Math.PI * 2.12,
  n = 26,
  tilt = 0
): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = from + (sweep * i) / n;
    const k = 1 + (i / n) * 0.07;
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    out.push([
      cx + x * Math.cos(tilt) - y * Math.sin(tilt),
      cy + x * Math.sin(tilt) + y * Math.cos(tilt),
    ]);
  }
  return out;
}

/** A quadratic arc from a to b, bowed by `bow` (a fraction of its length; the sign picks the side). */
export function arc(a: Pt, b: Pt, bow = 0.25, n = 16): Pt[] {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const cx = mx - dy * bow;
  const cy = my + dx * bow;
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push([
      (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * cx + t * t * b[0],
      (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * cy + t * t * b[1],
    ]);
  }
  return out;
}

/** Two short head strokes at the end of a line, angled back along its last segment. */
export function head(line: Pt[], len = 11): Pt[][] {
  const e = line[line.length - 1];
  const p = line[Math.max(0, line.length - 3)];
  const ang = Math.atan2(e[1] - p[1], e[0] - p[0]);
  return [-0.5, 0.48].map((o) => {
    const a = ang + Math.PI + o;
    return [
      e,
      [e[0] + Math.cos(a) * len * 0.55, e[1] + Math.sin(a) * len * 0.55],
      [e[0] + Math.cos(a) * len, e[1] + Math.sin(a) * len],
    ] as Pt[];
  });
}

export function Crayon({
  pts,
  w = 3.2,
  seed = 7,
  color,
  filter,
}: {
  pts: Pt[];
  w?: number;
  seed?: number;
  color: string;
  filter: string;
}) {
  const r = rng(seed);
  const wob = (p: Pt, k: number): Pt => [p[0] + (r() - 0.5) * k, p[1] + (r() - 0.5) * k];
  const layers: [number, number, number][] = [
    [w, 0.9, 1.6],
    [w * 0.55, 0.55, 2.6],
  ];
  return (
    <g
      filter={`url(#${filter})`}
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {layers.map(([lw, alpha, k], i) => (
        <path key={i} d={smooth(pts.map((p) => wob(p, k)))} strokeWidth={lw} opacity={alpha} />
      ))}
    </g>
  );
}

/** The crayon grain and paper grain filters, under ids unique to one frame. */
export function GrainDefs({ crayon, paper }: { crayon: string; paper: string }) {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
      <defs>
        <filter id={crayon} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="2"
            seed="3"
            result="n"
          />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.45"
            result="a"
          />
          <feComposite in="SourceGraphic" in2="a" operator="in" />
        </filter>
        <filter id={paper} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="9" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" />
        </filter>
      </defs>
    </svg>
  );
}
