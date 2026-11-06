import { useEffect, useRef, type ReactNode } from 'react';
import { ramp } from '../brand/colour';
import { BLOCK_FONT_STACK } from '#/football/lib/font';
import { finite } from '#/football/lib/finite';
import { formatMetricValue, ordinal } from './format';

/** One season on the x axis: "2026-27" over "Chelsea, 2,628 min". */
export interface SeasonTrendSeason {
  label: string;
  caption: string;
}

/** One season's point on a metric row. */
export interface SeasonTrendPoint {
  /** The per-90 value (or a rate for `percent`), drawn as the point's label. `null` draws no point. */
  value: number | null;
  /** 0-100 within the season's ranked-against group. `null` when the season has no ranking: the value draws on a hollow point, off the percentile scale. */
  percentile: number | null;
}

/** One metric across the seasons, one point per {@link SeasonTrendSeason}. */
export interface SeasonTrendRow {
  key: string;
  /** "Key passes per 90": the row's name, and its accessible name when `renderLabel` draws a control instead. */
  label: string;
  unit: 'per90' | 'percent';
  points: SeasonTrendPoint[];
}

export interface SeasonTrendProps {
  seasons: SeasonTrendSeason[];
  rows: SeasonTrendRow[];
  /** Draws a row's name, e.g. a dropdown that swaps the metric. Defaults to the plain label. */
  renderLabel?: (row: SeasonTrendRow) => ReactNode;
  /** Seasons in view at once; more scroll inside the chart, opening on the newest. */
  visibleSeasons?: number;
  /** Names the visually hidden table of the chart's values. */
  ariaLabel?: string;
}

const WHITE = '#ffffff';
const MUTED = '#a29e9e';
const SURFACE = '#151515';
const LINE = 'rgba(255,255,255,0.28)';
const GRID = 'rgba(255,255,255,0.07)';

/** Plot geometry in px: label room above 100, the 0-100 band, then the lane for seasons with no ranking. */
const TOP = 22;
const BAND = 72;
const LANE = 22;
const PLOT_H = TOP + BAND + LANE;
/** Width of the 0 / 50 / 100 gutter that stays put while the seasons scroll. */
const GUTTER = 28;

/** The y of a percentile inside a row's plot (0 at the band's foot, 100 at its head). */
export function seasonTrendY(percentile: number): number {
  const p = Math.min(100, Math.max(0, finite(percentile, 0)));
  return TOP + BAND * (1 - p / 100);
}

/** The y of a season with a value but no ranking: the lane under the band. */
export const SEASON_TREND_UNRANKED_Y = TOP + BAND + LANE / 2 + 2;

/** The x of season `i` of `n`, as a percentage of the plot width: the centre of its column. */
export function seasonTrendX(i: number, n: number): number {
  if (n <= 0) return 50;
  return finite(((i + 0.5) / n) * 100, 50);
}

/**
 * Consecutive ranked seasons, joined: a season with no ranking (or no value)
 * breaks the line, it is never drawn through.
 */
export function seasonTrendRuns(points: readonly SeasonTrendPoint[]): number[][] {
  const runs: number[][] = [];
  let current: number[] = [];
  points.forEach((p, i) => {
    if (p.value === null || p.percentile === null || !Number.isFinite(p.percentile)) {
      if (current.length > 1) runs.push(current);
      current = [];
      return;
    }
    current.push(i);
  });
  if (current.length > 1) runs.push(current);
  return runs;
}

/** "0.83 per 90, 94th percentile" / "58%, not ranked". */
export function seasonTrendReading(point: SeasonTrendPoint, unit: SeasonTrendRow['unit']): string {
  if (point.value === null) return 'No data';
  const value = formatMetricValue(point.value, unit);
  const shown = unit === 'per90' ? `${value} per 90` : value;
  return point.percentile === null || !Number.isFinite(point.percentile)
    ? `${shown}, not ranked`
    : `${shown}, ${ordinal(Math.round(point.percentile))} percentile`;
}

/**
 * Percentile trend by season (player profile Seasons panel): one row per
 * metric, x the seasons oldest to newest, y the season's percentile in the
 * group it was ranked against. Every metric shares the 0-100 scale, so an
 * elite finisher and a high-volume passer read on the same terms.
 *
 * Points take the wheel's ramp (muted grey up to full BTL red); each is
 * labelled with its value, the percentile shows in the tooltip and the
 * hidden table. A season with a value but no ranking draws hollow in a lane
 * under the scale, with no line segment.
 *
 * Fits its container: up to `visibleSeasons` columns share the width; more
 * scroll inside the chart, opening on the newest, while the row labels and
 * the 0 / 50 / 100 gutter stay put. No wordmark behind the data.
 */
export function SeasonTrend({
  seasons,
  rows,
  renderLabel,
  visibleSeasons = 5,
  ariaLabel = 'Percentile by season',
}: SeasonTrendProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const n = seasons.length;
  const overflow = n > visibleSeasons;

  useEffect(() => {
    const el = scroller.current;
    if (el && overflow) el.scrollLeft = el.scrollWidth;
  }, [overflow, n]);

  return (
    <figure
      data-slot="season-trend"
      className="m-0 flex min-w-0 flex-col"
      style={{ fontFamily: BLOCK_FONT_STACK, fontVariantNumeric: 'tabular-nums' }}
    >
      <div
        ref={scroller}
        data-slot="season-trend-scroll"
        className={overflow ? 'overflow-x-auto' : undefined}
      >
        <div
          style={{
            width: overflow
              ? `calc(${GUTTER}px + ${(n / visibleSeasons) * 100}% - ${(GUTTER * n) / visibleSeasons}px)`
              : '100%',
          }}
        >
          {rows.map((row) => (
            <div key={row.key} data-slot="season-trend-row" className="mb-1">
              <div
                className="sticky left-0 z-[2] w-fit max-w-full text-[13px] font-semibold"
                style={{ color: WHITE }}
              >
                {renderLabel ? renderLabel(row) : row.label}
              </div>
              <div className="flex" aria-hidden="true">
                <Gutter opaque={overflow} />
                <Plot row={row} n={n} />
              </div>
            </div>
          ))}
          <div className="flex" aria-hidden="true">
            <div
              className="sticky left-0 z-[2] flex-none"
              style={{ width: GUTTER, background: overflow ? SURFACE : undefined }}
            />
            <div
              className="grid min-w-0 flex-1"
              style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
            >
              {seasons.map((s) => (
                <div
                  key={s.label}
                  data-slot="season-trend-season"
                  className="flex min-w-0 flex-col items-center px-1 pt-1.5 text-center"
                >
                  <span
                    className="text-[12px] leading-[1.3] font-semibold"
                    style={{ color: WHITE }}
                  >
                    {s.label}
                  </span>
                  <span
                    className="text-[11px] leading-[1.3] [overflow-wrap:anywhere]"
                    style={{ color: MUTED }}
                  >
                    {s.caption}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* A table is as wide as its content whatever its own width, so the
          1 px clip sits on a wrapper: the hidden table never widens the page. */}
      <div className="sr-only">
        <table>
          <caption>{ariaLabel}</caption>
          <thead>
            <tr>
              <th scope="col">Season</th>
              <th scope="col">Club and minutes</th>
              {rows.map((row) => (
                <th key={row.key} scope="col">
                  {row.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {seasons.map((s, i) => (
              <tr key={s.label}>
                <th scope="row">{s.label}</th>
                <td>{s.caption}</td>
                {rows.map((row) => (
                  <td key={row.key}>
                    {seasonTrendReading(
                      row.points[i] ?? { value: null, percentile: null },
                      row.unit
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/**
 * The 0 / 50 / 100 scale, pinned left while the seasons scroll. Opaque only
 * then, so points pass under it; otherwise it takes the host's background
 * (a share card's is darker than the panel's).
 */
function Gutter({ opaque }: { opaque: boolean }) {
  return (
    <div
      className="sticky left-0 z-[2] flex-none"
      style={{ width: GUTTER, height: PLOT_H, background: opaque ? SURFACE : undefined }}
    >
      {[100, 50, 0].map((p) => (
        <span
          key={p}
          className="absolute right-2 -translate-y-1/2 text-[10px] leading-none"
          style={{ top: seasonTrendY(p), color: MUTED }}
        >
          {p}
        </span>
      ))}
    </div>
  );
}

function Plot({ row, n }: { row: SeasonTrendRow; n: number }) {
  return (
    <div className="relative min-w-0 flex-1" style={{ height: PLOT_H }}>
      {[100, 0].map((p) => (
        <div
          key={p}
          className="absolute inset-x-0"
          style={{ top: seasonTrendY(p), height: 1, background: GRID }}
        />
      ))}
      {/* The median, dashed as on the wheel. */}
      <div
        data-median=""
        className="absolute inset-x-0"
        style={{ top: seasonTrendY(50), borderTop: `1px dashed ${GRID}` }}
      />
      <svg
        className="absolute inset-0 h-full w-full overflow-visible"
        viewBox={`0 0 100 ${PLOT_H}`}
        preserveAspectRatio="none"
        focusable="false"
      >
        {seasonTrendRuns(row.points).map((run) => (
          <polyline
            key={run.join('-')}
            data-slot="season-trend-line"
            points={run
              .map((i) => `${seasonTrendX(i, n)},${seasonTrendY(row.points[i]!.percentile!)}`)
              .join(' ')}
            fill="none"
            stroke={LINE}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      {row.points.map((point, i) =>
        point.value === null ? null : (
          <Point
            key={i}
            point={point}
            unit={row.unit}
            x={seasonTrendX(i, n)}
            edge={i === 0 ? 'start' : i === n - 1 ? 'end' : undefined}
          />
        )
      )}
    </div>
  );
}

function Point({
  point,
  unit,
  x,
  edge,
}: {
  point: SeasonTrendPoint;
  unit: SeasonTrendRow['unit'];
  x: number;
  /** The first or last column: the tooltip opens inward so it never leaves the chart. */
  edge?: 'start' | 'end';
}) {
  const tipAnchor =
    edge === 'start' ? 'left-0' : edge === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2';
  const ranked = point.percentile !== null && Number.isFinite(point.percentile);
  const y = ranked ? seasonTrendY(point.percentile!) : SEASON_TREND_UNRANKED_Y;
  const reading = seasonTrendReading(point, unit);
  return (
    <div
      data-slot="season-trend-point"
      data-ranked={ranked ? '' : undefined}
      className="group absolute z-[1] flex hover:z-[4] -translate-x-1/2 -translate-y-1/2 items-center justify-center outline-none"
      style={{ left: `${x}%`, top: y, width: 24, height: 24 }}
    >
      <span
        className="block rounded-full"
        style={
          ranked
            ? {
                width: 10,
                height: 10,
                background: ramp(point.percentile, 'subject'),
                boxShadow: `0 0 0 2px ${SURFACE}, 0 0 0 3px rgba(255,255,255,0.18)`,
              }
            : {
                width: 9,
                height: 9,
                background: 'transparent',
                border: `1.5px solid ${MUTED}`,
              }
        }
      />
      <span
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 text-[11px] leading-none font-semibold whitespace-nowrap"
        style={{ color: ranked ? WHITE : MUTED, marginBottom: -2 }}
      >
        {formatMetricValue(point.value, unit)}
      </span>
      <span
        data-slot="season-trend-tip"
        className={`pointer-events-none absolute top-full ${tipAnchor} z-[3] mt-1 hidden rounded-[4px] border border-white/10 px-2 py-1 text-[12px] whitespace-nowrap group-hover:block`}
        style={{ background: '#1f1f1f', color: WHITE }}
      >
        {reading}
      </span>
    </div>
  );
}
