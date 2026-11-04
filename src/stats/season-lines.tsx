import { useId } from 'react';
import { ChartWatermark } from '../brand/wordmark';
import { BLOCK_FONT_STACK } from '#/football/lib/font';
import { finite } from '#/football/lib/finite';

/** One season's x-axis label plus its caption (mock: season label, "club, minutes"). */
export interface SeasonLinesSeason {
  /** "2026-27". */
  label: string;
  /** "Feyenoord, 2,014 min" (spec §4.2). */
  caption: string;
}

/** One line's values, one per {@link SeasonLinesSeason}, `null` where the season has no value — the line breaks there rather than interpolating. */
export interface SeasonLinesSeries {
  /** "Non-penalty goals and assists per 90" (legend label). */
  label: string;
  /** `subject` draws in BTL red; `secondary` in light grey (mock: red + `#d9d6d6`). */
  role: 'subject' | 'secondary';
  values: (number | null)[];
}

export interface SeasonLinesProps {
  seasons: SeasonLinesSeason[];
  series: SeasonLinesSeries[];
}

/** Viewbox + layout, taken verbatim from the mock (`prof/build.py:seasons_chart`). */
const VB_W = 1060;
const VB_H = 250;
const PAD_T = 28;
const PAD_B = 52;
const PAD_L = 40;
const PAD_L_EXTRA = 70;
const PAD_R = 12;
const WATERMARK_CX = VB_W / 2;
const WATERMARK_CY = (VB_H - PAD_B + PAD_T) / 2;

const SUBJECT_COLOUR = '#eb0000';
const SECONDARY_COLOUR = '#d9d6d6';
const MUTED = '#a29e9e';
const WHITE = '#ffffff';
const GRID_STEP = 1;

/**
 * A "nice" axis ceiling: the smallest multiple of {@link GRID_STEP} strictly
 * above the largest value, with a floor so a near-empty series still gets a
 * readable axis (mock: a fixed `ymax = 4.0`; this generalises it to whatever
 * data a caller passes, including a future team/manager template).
 */
export function seasonLinesYMax(series: SeasonLinesSeries[]): number {
  let max = 0;
  for (const s of series) for (const v of s.values) if (v !== null && v > max) max = v;
  if (max <= 0) return GRID_STEP * 4;
  return (Math.floor(max / GRID_STEP) + 1) * GRID_STEP;
}

/** Gridline values from 0 to `yMax` inclusive, one per {@link GRID_STEP}. */
export function seasonLinesGridValues(yMax: number): number[] {
  const out: number[] = [];
  for (let v = 0; v <= yMax + 1e-9; v += GRID_STEP) out.push(Number(v.toFixed(2)));
  return out;
}

/**
 * Split a series into its unbroken runs (a `null` value breaks the line
 * rather than being interpolated across, or drawn as 0 — a missing season is
 * a gap, not a zero).
 */
export function seasonLinesRuns(values: (number | null)[]): { index: number; value: number }[][] {
  const runs: { index: number; value: number }[][] = [];
  let current: { index: number; value: number }[] = [];
  values.forEach((v, index) => {
    if (v === null) {
      if (current.length > 0) runs.push(current);
      current = [];
      return;
    }
    current.push({ index, value: v });
  });
  if (current.length > 0) runs.push(current);
  return runs;
}

function colourFor(role: SeasonLinesSeries['role']): string {
  return role === 'subject' ? SUBJECT_COLOUR : SECONDARY_COLOUR;
}

/**
 * Per-90 output across seasons (spec §4.1, §4.2: "per-90 lines by season
 * with club and minutes labels"; mock `prof/build.py:seasons_chart`, which
 * plots non-penalty goals-and-assists per 90 in red against key passes per
 * 90 in grey). Generalised to any number of series so the entity-agnostic
 * compare engine's later templates (team, manager — spec §3.6) can reuse
 * this chart with their own metrics.
 *
 * A `null` value breaks that series' line for that season rather than
 * drawing a zero or interpolating across the gap. A faint wordmark sits
 * behind the data (spec §4.4).
 */
export function SeasonLines({ seasons, series }: SeasonLinesProps) {
  const uid = useId();
  const yMax = seasonLinesYMax(series);
  const plotLeft = PAD_L + PAD_L_EXTRA;
  const plotRight = VB_W - PAD_R;
  const plotWidth = plotRight - plotLeft;
  const n = seasons.length;
  const xFor = (i: number): number =>
    n <= 1 ? (plotLeft + plotRight) / 2 : finite(plotLeft + (i * plotWidth) / (n - 1), plotLeft);
  const baselineY = VB_H - PAD_B;
  const yFor = (v: number): number =>
    finite(PAD_T + (baselineY - PAD_T) * (1 - v / yMax), baselineY);

  return (
    <figure
      data-slot="season-lines"
      style={{ fontFamily: BLOCK_FONT_STACK }}
      className="my-6 flex flex-col gap-3 rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4"
    >
      <div className="flex flex-wrap gap-4">
        {series.map((s) => (
          <span
            key={s.label}
            className="inline-flex items-center gap-1.5 text-[12px]"
            style={{ color: MUTED }}
          >
            <span
              className="inline-block h-[2px] w-3.5"
              style={{ background: colourFor(s.role) }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label="Per 90 output by season"
        className="block w-full"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        <ChartWatermark cx={WATERMARK_CX} cy={WATERMARK_CY} />

        {seasonLinesGridValues(yMax).map((v) => (
          <g key={`grid-${v}`}>
            <line
              x1={plotLeft}
              x2={plotRight}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="white"
              strokeOpacity={v === 0 ? 0.12 : 0.06}
            />
            <text x={plotLeft - 10} y={yFor(v) + 4} textAnchor="end" fontSize={11} fill={MUTED}>
              {v}
            </text>
          </g>
        ))}

        {series.map((s) => {
          const colour = colourFor(s.role);
          return (
            <g key={s.label} data-slot="season-line">
              {seasonLinesRuns(s.values).map((run, runIndex) => (
                <polyline
                  key={`${uid}-${s.label}-${runIndex}`}
                  points={run.map((p) => `${xFor(p.index)},${yFor(p.value)}`).join(' ')}
                  fill="none"
                  stroke={colour}
                  strokeWidth={2}
                />
              ))}
              {s.values.map((v, i) =>
                v === null ? null : (
                  <g key={`${uid}-${s.label}-pt-${i}`}>
                    <circle cx={xFor(i)} cy={yFor(v)} r={4} fill={colour} />
                    <text
                      x={xFor(i)}
                      y={yFor(v) - 9}
                      textAnchor="middle"
                      fontSize={11}
                      fill={colour}
                    >
                      {v.toFixed(2)}
                    </text>
                  </g>
                )
              )}
            </g>
          );
        })}

        {seasons.map((season, i) => (
          <g key={season.label}>
            <text
              x={xFor(i)}
              y={baselineY + 22}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              fill={WHITE}
            >
              {season.label}
            </text>
            <text x={xFor(i)} y={baselineY + 38} textAnchor="middle" fontSize={11} fill={MUTED}>
              {season.caption}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
