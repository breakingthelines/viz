import { useId } from 'react';
import { cn } from '#/lib/utils';
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
  /** Overrides the svg's `aria-label` (default "Per 90 output by season"). Set this to describe what the series actually hold when a caller reuses the chart for a different metric pair. */
  ariaLabel?: string;
  /** Wraps the chart in its own card chrome (border, background, margin, padding). Defaults to `false` so a host panel that already supplies card chrome does not get a card inside a card. */
  framed?: boolean;
}

/** Viewbox + layout, taken verbatim from the mock (`prof/build.py:seasons_chart`). */
const VB_W = 1060;
const VB_H = 250;
const PAD_T = 28;
const PAD_B = 52;
const PAD_L = 40;
/** How far right of `PAD_L` the first data point sits, and how far short of `VB_W` the last one sits (mock: `L + 70 + i * (W - L - 160) / (n-1)`, so the data span runs from `PAD_L + 70` to `VB_W - 90`, inside the wider gridline span of `PAD_L` to `VB_W - PAD_R`). */
const DATA_LEFT_INSET = 70;
const DATA_RIGHT_INSET = 90;
const PAD_R = 12;

const SUBJECT_COLOUR = '#eb0000';
const SECONDARY_COLOUR = '#d9d6d6';
const MUTED = '#a29e9e';
const WHITE = '#ffffff';
/**
 * `#eb0000` is for fills and strokes only (the line, its point, the legend
 * swatch) — as text on the chart's dark background it fails colour
 * contrast (4.29:1, axe `color-contrast`). The subject's per-point value
 * label uses this brighter red instead, so it stays readable without
 * changing the line/point colour itself.
 */
const SUBJECT_TEXT_COLOUR = '#ff3b3b';

function largestValue(series: SeasonLinesSeries[]): number {
  let max = 0;
  for (const s of series) for (const v of s.values) if (v !== null && v > max) max = v;
  return max;
}

/**
 * A "nice" gridline step (1/2/5 x 10^k) for roughly 4-5 ticks over
 * `[0, target]`, so a per-90 rate (small, fractional) and a per-90-minutes
 * count in the dozens both get a readable axis rather than one gridline per
 * integer.
 */
function niceStep(target: number): number {
  const rough = target / 4;
  if (rough <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}

/**
 * The gridline step for this data (mock: a fixed step of 1, for its
 * `ymax = 4.0`; this generalises it — see {@link niceStep} — so a team or
 * manager template with a different scale still gets 4-5 gridlines rather
 * than, say, one per unit across a 0-62 per-90-minutes count).
 */
export function seasonLinesGridStep(series: SeasonLinesSeries[]): number {
  return niceStep(Math.max(4, largestValue(series)));
}

/**
 * A "nice" axis ceiling: the smallest multiple of {@link seasonLinesGridStep}
 * strictly above the largest value, with a floor of 4 so a near-empty
 * series still gets the mock's own axis (mock: a fixed `ymax = 4.0`; this
 * generalises it to whatever data a caller passes, including a future
 * team/manager template).
 */
export function seasonLinesYMax(series: SeasonLinesSeries[]): number {
  const target = Math.max(4, largestValue(series));
  const step = niceStep(target);
  return Math.ceil(target / step) * step;
}

/** Gridline values from 0 to `yMax` inclusive, one per `step`. */
export function seasonLinesGridValues(yMax: number, step: number = 1): number[] {
  const out: number[] = [];
  for (let v = 0; v <= yMax + 1e-9; v += step) out.push(Number(v.toFixed(2)));
  return out;
}

/**
 * The x position of the `i`th of `n` data points (mock:
 * `L + 70 + i * (W - L - 160) / (n-1)`). A single point centres in the full
 * data span rather than landing at its left edge.
 */
export function seasonLinesXFor(i: number, n: number): number {
  const dataLeft = PAD_L + DATA_LEFT_INSET;
  const dataRight = VB_W - DATA_RIGHT_INSET;
  if (n <= 1) return (dataLeft + dataRight) / 2;
  return finite(dataLeft + (i * (dataRight - dataLeft)) / (n - 1), dataLeft);
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

/** As {@link colourFor}, but for text: the subject's text reads in the brighter `#ff3b3b`, never the fill/stroke `#eb0000`. */
function textColourFor(role: SeasonLinesSeries['role']): string {
  return role === 'subject' ? SUBJECT_TEXT_COLOUR : SECONDARY_COLOUR;
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
 * drawing a zero or interpolating across the gap. No wordmark behind the
 * data: the host panel's signature is the only brand mark (owner, 2026-11).
 *
 * Renders bare by default — `framed` opts into the card-style border that
 * earlier shipped unconditionally, which doubled up with a host panel that
 * already supplies its own card chrome.
 */
export function SeasonLines({
  seasons,
  series,
  ariaLabel = 'Per 90 output by season',
  framed = false,
}: SeasonLinesProps) {
  const uid = useId();
  const yMax = seasonLinesYMax(series);
  const gridStep = seasonLinesGridStep(series);
  const gridLeft = PAD_L;
  const gridRight = VB_W - PAD_R;
  const n = seasons.length;
  const xFor = (i: number): number => seasonLinesXFor(i, n);
  const baselineY = VB_H - PAD_B;
  const yFor = (v: number): number =>
    finite(PAD_T + (baselineY - PAD_T) * (1 - v / yMax), baselineY);

  return (
    <figure
      data-slot="season-lines"
      style={{ fontFamily: BLOCK_FONT_STACK }}
      className={cn(
        'flex flex-col gap-3',
        framed && 'my-6 rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4'
      )}
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
        aria-label={ariaLabel}
        className="block w-full"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {seasonLinesGridValues(yMax, gridStep).map((v) => (
          <g key={`grid-${v}`}>
            <line
              x1={gridLeft}
              x2={gridRight}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="white"
              strokeOpacity={v === 0 ? 0.12 : 0.06}
            />
            <text x={gridLeft - 10} y={yFor(v) + 4} textAnchor="end" fontSize={11} fill={MUTED}>
              {v}
            </text>
          </g>
        ))}

        {series.map((s) => {
          const colour = colourFor(s.role);
          const textColour = textColourFor(s.role);
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
                      fill={textColour}
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

      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Season</th>
            <th scope="col">Club and minutes</th>
            {series.map((s) => (
              <th key={s.label} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {seasons.map((season, i) => (
            <tr key={season.label}>
              <th scope="row">{season.label}</th>
              <td>{season.caption}</td>
              {series.map((s) => (
                <td key={s.label}>{s.values[i] === null ? 'No data' : s.values[i]?.toFixed(2)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
