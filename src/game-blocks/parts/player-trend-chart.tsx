import { useBlockSkin } from '../skin/index';

/**
 * Percentiles across seasons: one line per metric on the 0 to 100 scale,
 * oldest season on the left, the group median (50) as a dashed level. The
 * highlighted metric takes the subject colour; the others are quiet. A season
 * with no figure breaks the line. Used by Season trend.
 */

export interface PlayerTrendLine {
  key: string;
  label: string;
  /** One per season, oldest first. Null where there is no figure. */
  points: (number | null)[];
  highlight?: boolean;
}

const W = 340;
const H = 200;
const PAD = { l: 8, r: 30, t: 12, b: 26 };

export function trendX(i: number, n: number): number {
  if (n <= 1) return PAD.l + (W - PAD.l - PAD.r) / 2;
  return PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
}

export function trendY(p: number): number {
  return PAD.t + (1 - Math.min(100, Math.max(0, p)) / 100) * (H - PAD.t - PAD.b);
}

/** Splits a series into runs of consecutive figures, as `[index, value]` pairs. */
export function trendRuns(points: (number | null)[]): [number, number][][] {
  const runs: [number, number][][] = [];
  let cur: [number, number][] = [];
  points.forEach((p, i) => {
    if (p === null) {
      if (cur.length) runs.push(cur);
      cur = [];
    } else cur.push([i, p]);
  });
  if (cur.length) runs.push(cur);
  return runs;
}

/** End labels pushed apart so none overlap: at least `gap` units between centres. */
export function spreadLabels(ys: number[], gap = 13): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < order.length; k++) {
    if (order[k].y - order[k - 1].y < gap) order[k].y = order[k - 1].y + gap;
  }
  const out: number[] = Array.from({ length: ys.length }, () => 0);
  for (const o of order) out[o.i] = o.y;
  return out;
}

/** "2025/26" to "25/26". */
function shortSeason(label: string): string {
  return label.replace(/^\d{2}(\d{2}\/\d{2})$/, '$1');
}

export function PlayerTrendChart({
  seasons,
  lines,
  ariaLabel,
}: {
  seasons: string[];
  lines: PlayerTrendLine[];
  ariaLabel: string;
}) {
  const skin = useBlockSkin();
  const n = seasons.length;
  const ordered = [...lines].sort((a, b) => Number(!!a.highlight) - Number(!!b.highlight));
  const ends = ordered.map((l) => {
    for (let i = l.points.length - 1; i >= 0; i--) {
      const p = l.points[i];
      if (p !== null && p !== undefined) return { i, p };
    }
    return null;
  });
  const labelYs = spreadLabels(ends.map((e) => (e ? trendY(e.p) : trendY(50))));
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={ariaLabel}
        data-trend-chart=""
        style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}
      >
        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={trendY(50)}
          y2={trendY(50)}
          style={{ stroke: 'var(--btl-block-tick)', strokeWidth: 1, strokeDasharray: '3 3' }}
        />
        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={trendY(0)}
          y2={trendY(0)}
          style={{ stroke: 'var(--btl-block-line-strong)', strokeWidth: 1 }}
        />
        {seasons.map((s, i) => (
          <text
            key={s}
            x={trendX(i, n)}
            y={H - 8}
            textAnchor={n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle'}
            style={{ fill: 'var(--btl-block-ink-3)', fontFamily: skin.fontSans, fontSize: 10.5 }}
          >
            {shortSeason(s)}
          </text>
        ))}
        {ordered.map((l, li) => {
          const stroke = l.highlight ? 'var(--btl-block-subject)' : 'var(--btl-block-ink-4)';
          const end = ends[li];
          return (
            <g key={l.key} data-trend-line={l.key}>
              {trendRuns(l.points).map((run, ri) =>
                run.length > 1 ? (
                  <polyline
                    key={ri}
                    fill="none"
                    points={run.map(([i, p]) => `${trendX(i, n)},${trendY(p)}`).join(' ')}
                    style={{ stroke, strokeWidth: l.highlight ? 2.5 : 1.5 }}
                  />
                ) : null
              )}
              {l.points.map((p, i) =>
                p === null ? null : (
                  <circle
                    key={i}
                    cx={trendX(i, n)}
                    cy={trendY(p)}
                    r={l.highlight ? 3.5 : 2.5}
                    data-trend-point={end && end.i === i ? 'last' : undefined}
                    style={{ fill: stroke }}
                  />
                )
              )}
              {end ? (
                <text
                  x={W - PAD.r + 8}
                  y={labelYs[li] + 3.5}
                  style={{
                    fill: l.highlight ? 'var(--btl-block-ink-1)' : 'var(--btl-block-ink-3)',
                    fontFamily: skin.fontSans,
                    fontSize: 11,
                    fontWeight: l.highlight ? 600 : 400,
                  }}
                >
                  {Math.round(end.p)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <p
        style={{
          margin: '6px 0 0',
          display: 'flex',
          flexWrap: 'wrap',
          columnGap: 14,
          rowGap: 2,
          fontFamily: skin.fontSans,
          fontSize: 12,
          color: 'var(--btl-block-ink-2)',
        }}
      >
        {[...ordered].reverse().map((l) => (
          <span key={l.key} style={{ whiteSpace: 'nowrap' }}>
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 12,
                marginRight: 5,
                verticalAlign: 'middle',
                borderTop: `${l.highlight ? 2.5 : 1.5}px solid ${l.highlight ? 'var(--btl-block-subject)' : 'var(--btl-block-ink-4)'}`,
              }}
            />
            {l.label}
          </span>
        ))}
      </p>
    </div>
  );
}
