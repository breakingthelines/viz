import { useEffect, useRef, useState } from 'react';
import { BLOCK_FONT_STACK } from '#/football/lib/font';

/** One team on the style map. */
export interface StyleMapPoint {
  id: string;
  label: string;
  /** x value, e.g. possession %. */
  x: number;
  /** y value, e.g. PPDA. */
  y: number;
  /** Crest image URL. */
  crest: string;
  /** Present when the team has a page. */
  href?: string;
}

export interface StyleMapProps {
  points: StyleMapPoint[];
  xLabel: string;
  yLabel: string;
  ariaLabel: string;
  /** Draws lower y values at the top (PPDA: a harder press reads higher). */
  invertY?: boolean;
  /** Formats an x value for the axis and the crest titles. */
  formatX?: (v: number) => string;
  /** Formats a y value for the axis and the crest titles. */
  formatY?: (v: number) => string;
  /** Width used before the container is measured (server render). */
  initialWidth?: number;
}

const MUTED = '#a29e9e';
const LIGHT = '#d9d6d6';
const GRID = 'rgba(255,255,255,0.06)';
const MEAN = 'rgba(255,255,255,0.28)';

/** Round tick step for a span: 1, 2, 2.5 or 5 times a power of ten, about five ticks. */
export function styleMapStep(span: number): number {
  if (!(span > 0) || !Number.isFinite(span)) return 1;
  const raw = span / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (raw <= m * pow) return m * pow;
  }
  return 10 * pow;
}

/**
 * The axis domain and ticks for values: padded by a crest's worth of room,
 * snapped outward to the tick step.
 */
export function styleMapAxis(values: number[]): { min: number; max: number; ticks: number[] } {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return { min: 0, max: 1, ticks: [0, 1] };
  let lo = Math.min(...finite);
  let hi = Math.max(...finite);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.06;
  const step = styleMapStep(hi - lo + 2 * pad);
  const min = Math.floor((lo - pad) / step) * step;
  const max = Math.ceil((hi + pad) / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 1e6; v += step) ticks.push(Number(v.toFixed(6)));
  return { min, max, ticks };
}

export interface StyleMapPlaced {
  id: string;
  x: number;
  y: number;
}

/**
 * Pushes overlapping crests apart: pairs closer than `size` move away from
 * each other along the line between them, a quarter of the overlap each
 * pass, then stay inside the plot. Deterministic for the same input.
 */
export function nudgeStyleMap(
  points: StyleMapPlaced[],
  size: number,
  bounds: { left: number; right: number; top: number; bottom: number },
  passes = 60
): StyleMapPlaced[] {
  const out = points.map((p) => ({ ...p }));
  const gap = size + 2;
  const half = size / 2;
  for (let k = 0; k < passes; k++) {
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i];
        const b = out[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= gap) continue;
        if (d === 0) {
          // Same spot: split along a fixed diagonal so the result is stable.
          dx = 1;
          dy = 1;
          d = Math.SQRT2;
        }
        const push = (gap - d) / 4;
        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push;
        b.x += (dx / d) * push;
        b.y += (dy / d) * push;
        moved = true;
      }
    }
    for (const p of out) {
      p.x = Math.min(bounds.right - half, Math.max(bounds.left + half, p.x));
      p.y = Math.min(bounds.bottom - half, Math.max(bounds.top + half, p.y));
    }
    if (!moved) break;
  }
  return out;
}

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/**
 * Teams as crests on two axes, one league season: the league's mean of each
 * axis as a dotted line, crests nudged apart where they overlap. Sizes to
 * its container: crests and type stay the same size from phone to desktop.
 */
export function StyleMap({
  points,
  xLabel,
  yLabel,
  ariaLabel,
  invertY = false,
  formatX = fmt,
  formatY = fmt,
  initialWidth = 1000,
}: StyleMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(initialWidth);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setWidth(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = width < 560;
  const W = Math.max(280, width);
  const H = Math.round(Math.min(560, Math.max(340, W * 0.56)));
  const size = narrow ? 22 : 28;
  const L = narrow ? 40 : 56;
  const R = narrow ? 8 : 24;
  const T = 16;
  const B = narrow ? 46 : 52;
  const font = narrow ? 11 : 12;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const ax = styleMapAxis(xs);
  const ay = styleMapAxis(ys);
  const X = (v: number) => L + ((v - ax.min) / (ax.max - ax.min)) * (W - L - R);
  const Yraw = (v: number) => (v - ay.min) / (ay.max - ay.min);
  const Y = (v: number) => T + (invertY ? Yraw(v) : 1 - Yraw(v)) * (H - T - B);
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / (v.length || 1);

  const xTicks = narrow ? ax.ticks.filter((_, i) => i % 2 === 0) : ax.ticks;
  const placed = nudgeStyleMap(
    points.map((p) => ({ id: p.id, x: X(p.x), y: Y(p.y) })),
    size,
    { left: L, right: W - R, top: T, bottom: H - B }
  );
  const byId = new Map(points.map((p) => [p.id, p]));

  return (
    <div ref={ref} data-slot="style-map" className="w-full min-w-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={ariaLabel}
        style={{
          display: 'block',
          fontFamily: BLOCK_FONT_STACK,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {xTicks.map((v) => (
          <g key={`x${v}`}>
            <line x1={X(v)} x2={X(v)} y1={T} y2={H - B} stroke={GRID} />
            <text x={X(v)} y={H - B + 18} textAnchor="middle" fill={MUTED} fontSize={font}>
              {formatX(v)}
            </text>
          </g>
        ))}
        {ay.ticks.map((v) => (
          <g key={`y${v}`}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke={GRID} />
            <text x={L - 8} y={Y(v) + 4} textAnchor="end" fill={MUTED} fontSize={font}>
              {formatY(v)}
            </text>
          </g>
        ))}
        {points.length > 1 && (
          <>
            <line
              data-slot="style-map-mean-x"
              x1={X(mean(xs))}
              x2={X(mean(xs))}
              y1={T}
              y2={H - B}
              stroke={MEAN}
              strokeDasharray="2 4"
            />
            <line
              data-slot="style-map-mean-y"
              x1={L}
              x2={W - R}
              y1={Y(mean(ys))}
              y2={Y(mean(ys))}
              stroke={MEAN}
              strokeDasharray="2 4"
            />
          </>
        )}
        <text x={(L + W - R) / 2} y={H - 8} textAnchor="middle" fill={LIGHT} fontSize={font + 1}>
          {xLabel}
        </text>
        <text
          transform={`translate(${narrow ? 10 : 14} ${(T + H - B) / 2}) rotate(-90)`}
          textAnchor="middle"
          fill={LIGHT}
          fontSize={font + 1}
        >
          {yLabel}
        </text>
        {placed.map((pt) => {
          const p = byId.get(pt.id)!;
          const title = `${p.label}, ${xLabel} ${formatX(p.x)}, ${yLabel} ${formatY(p.y)}`;
          const img = (
            <image
              href={p.crest}
              x={pt.x - size / 2}
              y={pt.y - size / 2}
              width={size}
              height={size}
              preserveAspectRatio="xMidYMid meet"
            >
              <title>{title}</title>
            </image>
          );
          return (
            <g key={p.id} data-slot="style-map-team" data-team={p.id}>
              {p.href ? (
                <a href={p.href} aria-label={title}>
                  {img}
                </a>
              ) : (
                img
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
