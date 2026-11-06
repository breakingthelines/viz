import { useEffect, useRef, useState } from 'react';
import { cn } from '#/lib/utils';
import { ratingColour } from '../brand/colour';
import { BLOCK_FONT_STACK } from '#/football/lib/font';
import { finite } from '#/football/lib/finite';
import type { EntityLink } from './stat-metric';

/**
 * The opponent under a bar. `label` is the full name, carried by the
 * tooltip and the accessible name; what shows under the bar is
 * `shortLabel` on wide layouts and the crest on narrow ones, so ten
 * neighbouring names never run into each other.
 */
export interface FormChartOpponent extends EntityLink {
  /** A short form that fits under a bar ("Man United", "Brighton"). Falls back to `label`, cut with an ellipsis when it still does not fit. */
  shortLabel?: string;
  /** Crest addresses in the order to try them, shown under the bar in place of the name on narrow layouts. With none, or when every one fails to load, a three-letter mark ({@link formOpponentCode}) shows instead. */
  crestSources?: readonly string[];
}

/**
 * One rated match in the form strip (spec §4.1; mock `prof/page2.py:form_rows`
 * — rows ordered oldest to newest, same order this component expects
 * `matches` in). `rating` drives the bar height and colour
 * ({@link ratingColour}); `title` is the mock's full-sentence tooltip
 * ("8 Sep 2026, Feyenoord 2-1 AZ, Eredivisie, 90 min, rating 7.4").
 */
export interface FormChartMatch {
  id: string;
  /** Already formatted for display (mock: `dfmt(date, true)`, e.g. "8 Sep 2026"). */
  date: string;
  opponent: FormChartOpponent;
  result: 'W' | 'D' | 'L';
  /** "2-1", from the subject's own side (mock: `us`-`them`). */
  score: string;
  venue: 'H' | 'A';
  minutes: number;
  goals: number;
  assists: number;
  /** Roughly 0-10; feeds {@link ratingColour}. */
  rating: number;
  /** Full-sentence tooltip text for the bar (mock: `r["t"]`). */
  title: string;
  /** Present when the match itself resolves to a BTL match/report page. */
  href?: string;
}

export interface FormChartProps {
  /**
   * Every rated match currently loaded, oldest to newest. The strip always
   * opens on the most recent {@link window} of these; "Earlier matches"
   * steps back by {@link step} within this array, and once the view would
   * run past its start, a further click calls {@link onOlder} instead (the
   * caller then prepends more matches, across seasons — spec §4.2).
   */
  matches: FormChartMatch[];
  /** Matches shown at once. Mock default 10. */
  window?: number;
  /** Matches stepped per click. Mock default 5. */
  step?: number;
  /** Rating axis domain. Mock default [5, 10]. */
  yDomain?: [number, number];
  /** The rating whose gridline draws brighter (mock: fixed at 7, the rating where its colour ramp starts warming). Default 7. */
  emphasisRating?: number;
  /** True when the host can load matches earlier than `matches[0]`. */
  hasOlder?: boolean;
  /** Requests earlier matches (the host prepends them and keeps the same visual position — spec: "pages back through every rated match", across seasons). */
  onOlder?: () => void;
  /** Wraps the chart in its own card chrome (border, background, margin, padding). Defaults to `false` so a host panel that already supplies card chrome does not get a card inside a card. */
  framed?: boolean;
}

/**
 * Viewbox + layout, from the mock (`prof/page2.py:form_chart`, JS at
 * `page2.py:365-384`), less the mock's 46-unit label strip under the
 * baseline: the opponent and result labels are HTML under the svg
 * ({@link FormLabels}), so they keep their own size at any width instead
 * of scaling down with the chart, and can be cut with an ellipsis. The
 * plot itself (154 units tall) is unchanged.
 */
const VB_W = 680;
const VB_H = 184;
const PAD_T = 26;
const PAD_B = 4;
const PAD_L = 8;

const DEFAULT_WINDOW = 10;
const DEFAULT_STEP = 5;
const DEFAULT_Y_DOMAIN: [number, number] = [5, 10];
/** The rating where the mock's brighter gridline sits (mock: `v === 7 ? 0.12 : 0.05`) — not `yDomain[0] + 1`, which only happens to equal 7 for the default `[5, 10]` domain. */
const DEFAULT_EMPHASIS_RATING = 7;

const MUTED = '#a29e9e';
const WHITE = '#ffffff';

/** Map a rating to its y in viewBox units, given the axis domain (mock: `y(v)`). */
function ratingToY(rating: number, [lo, hi]: [number, number]): number {
  const span = hi - lo || 1;
  return finite(PAD_T + (VB_H - PAD_T - PAD_B) * (1 - (rating - lo) / span), VB_H - PAD_B);
}

/** Gridline values between the domain's low and high end, one per integer step (mock: fixed `[6,7,8,9,10]` for `[5,10]`). */
export function formChartGridValues([lo, hi]: [number, number]): number[] {
  const out: number[] = [];
  for (let v = Math.ceil(lo) + (Math.ceil(lo) === lo ? 1 : 0); v <= hi; v++) out.push(v);
  return out;
}

/**
 * Clamp a requested window end into `[windowSize, total]` — a window can
 * never show fewer than `windowSize` matches (the mock's `Math.max(n, ...)`)
 * nor run past the end of what is loaded.
 */
export function clampWindowEnd(total: number, end: number, windowSize: number): number {
  return Math.min(total, Math.max(windowSize, end));
}

/**
 * A bar's width, over the whole window size rather than however many
 * matches currently fill it (mock: `bw = (W - L*2) / n`, `n` the window
 * size). With fewer loaded matches than a full window, the bars stay the
 * same width and sit flush left, with empty room to their right, rather
 * than growing to fill the gap.
 */
export function formChartBarWidth(windowSize: number): number {
  return (VB_W - PAD_L * 2) / windowSize;
}

/** The "G"/"A" marker string for a bar (mock: `Array(g+1).join('G')+Array(a+1).join('A')`, i.e. `g` G's then `a` A's). */
export function goalAssistMarker(goals: number, assists: number): string {
  return 'G'.repeat(Math.max(0, goals)) + 'A'.repeat(Math.max(0, assists));
}

/** Window-stats readout for the matches currently on screen (mock: `.fstats`). */
export function computeWindowStats(matches: FormChartMatch[]): {
  averageRating: number;
  goals: number;
  assists: number;
  minutes: number;
} {
  if (matches.length === 0) return { averageRating: 0, goals: 0, assists: 0, minutes: 0 };
  const sumRating = matches.reduce((s, m) => s + m.rating, 0);
  return {
    averageRating: sumRating / matches.length,
    goals: matches.reduce((s, m) => s + m.goals, 0),
    assists: matches.reduce((s, m) => s + m.assists, 0),
    minutes: matches.reduce((s, m) => s + m.minutes, 0),
  };
}

/** "8 Sep 2026 to 2 Nov 2026" — the dates of the first and last visible match (mock: `.frange`). */
export function formatWindowRange(matches: FormChartMatch[]): string {
  if (matches.length === 0) return '';
  const first = matches[0]?.date ?? '';
  const last = matches[matches.length - 1]?.date ?? '';
  return `${first} to ${last}`;
}

const RESULT_LABEL: Record<FormChartMatch['result'], string> = { W: 'Won', D: 'Drew', L: 'Lost' };
const VENUE_LABEL: Record<FormChartMatch['venue'], string> = { H: 'home', A: 'away' };

/**
 * The accessible name for one bar's link (spec §4.5/a11y): a screen reader
 * hears the date, opponent, result, rating and goal/assist contribution —
 * the same facts the bar's visible labels carry, since `role="img"` on the
 * chart's `<svg>` would otherwise make a keyboard focus land on this link
 * with no announced name beyond the chart's own title.
 */
export function formBarAccessibleName(match: FormChartMatch): string {
  const parts = [
    match.date,
    `${RESULT_LABEL[match.result]} ${match.score} vs ${match.opponent.label}`,
    VENUE_LABEL[match.venue],
    `rating ${match.rating.toFixed(1)}`,
  ];
  if (match.goals > 0) parts.push(`${match.goals} goal${match.goals === 1 ? '' : 's'}`);
  if (match.assists > 0) parts.push(`${match.assists} assist${match.assists === 1 ? '' : 's'}`);
  return parts.join(', ');
}

/**
 * The Overview form strip (spec §4.1, §4.2: "last 10 rated matches as bars
 * coloured by rating, rating above, G/A marks, opponent and 'W 2-1, H'
 * below"; paging "back through every rated match", across seasons). No
 * wordmark behind the data: the host panel's signature is the only brand
 * mark (owner, 2026-11).
 *
 * `matches` is the caller's current load, oldest to newest; this component
 * only windows over it and asks for more through {@link FormChartProps.onOlder}
 * — it never fetches.
 */
export function FormChart({
  matches,
  window: windowSize = DEFAULT_WINDOW,
  step = DEFAULT_STEP,
  yDomain = DEFAULT_Y_DOMAIN,
  emphasisRating = DEFAULT_EMPHASIS_RATING,
  hasOlder = false,
  onOlder,
  framed = false,
}: FormChartProps) {
  // Tracked as "how far back from the newest match" rather than an absolute
  // index, so the window stays visually put when `matches` grows at the
  // front after an `onOlder` fetch (mock: an `end` index into a STATIC
  // array; here the array itself can grow, so the offset from the end is
  // the stable quantity).
  const [offsetFromEnd, setOffsetFromEnd] = useState(0);

  // Set while a click on "Earlier matches" at the oldest loaded match is
  // waiting for the host to prepend more (`onOlder`). Guards against a
  // double click firing `onOlder` twice, and tells the effect below to step
  // the window back once `matches` actually grows, rather than leaving the
  // window parked on the same matches until a second click.
  const [pendingOlder, setPendingOlder] = useState(false);

  const newestId = matches.length > 0 ? matches[matches.length - 1]?.id : undefined;
  const prevNewestId = useRef(newestId);
  const prevLength = useRef(matches.length);
  const prevHasOlder = useRef(hasOlder);

  useEffect(() => {
    const subjectChanged = newestId !== prevNewestId.current;
    const grew = matches.length > prevLength.current;
    const hasOlderDropped = prevHasOlder.current && !hasOlder;
    prevNewestId.current = newestId;
    prevLength.current = matches.length;
    prevHasOlder.current = hasOlder;

    if (hasOlderDropped) {
      // The host now says there is nothing further to load. Whether that
      // is a normal "fully loaded" signal or the host's answer to a
      // prepend that came back empty or failed, a `pendingOlder` left set
      // would otherwise wait forever for a `matches` growth that is never
      // coming, leaving "Earlier matches" disabled for good even though
      // `earlierDisabled` already covers the `!hasOlder` case on its own.
      setPendingOlder(false);
    }

    if (subjectChanged) {
      // A different player's matches (even one that happens to share a
      // length) opens on the newest window rather than keeping a stale
      // offset from whoever was shown before.
      setOffsetFromEnd(0);
      setPendingOlder(false);
      return;
    }
    if (grew && pendingOlder) {
      setOffsetFromEnd((prev) => Math.min(matches.length - windowSize, prev + step));
      setPendingOlder(false);
      return;
    }
    // Defensive clamp for any other length change (e.g. the host trims the
    // array) that is not a subject switch or a pending `onOlder` response.
    setOffsetFromEnd((prev) => Math.min(prev, Math.max(0, matches.length - windowSize)));
  }, [newestId, matches.length, windowSize, step, pendingOlder, hasOlder]);

  const end = clampWindowEnd(matches.length, matches.length - offsetFromEnd, windowSize);
  const start = Math.max(0, end - windowSize);
  const visible = matches.slice(start, end);

  const atOldestLoaded = start <= 0;
  const earlierDisabled = atOldestLoaded && (pendingOlder || !hasOlder);
  const laterDisabled = offsetFromEnd <= 0;

  const goEarlier = () => {
    if (atOldestLoaded) {
      if (pendingOlder) return;
      setPendingOlder(true);
      onOlder?.();
      return;
    }
    setOffsetFromEnd((prev) => Math.min(matches.length - windowSize, prev + step));
  };
  const goLater = () => {
    setOffsetFromEnd((prev) => Math.max(0, prev - step));
  };

  const stats = computeWindowStats(visible);
  const range = formatWindowRange(visible);
  const barWidth = formChartBarWidth(windowSize);
  const baselineY = VB_H - PAD_B;

  return (
    <figure
      data-slot="form-chart"
      style={{ fontFamily: BLOCK_FONT_STACK }}
      className={cn(
        '@container flex flex-col gap-3',
        framed && 'my-6 rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-6">
          <Stat label="Average rating" value={stats.averageRating.toFixed(2)} />
          <Stat label="Goals" value={stats.goals} />
          <Stat label="Assists" value={stats.assists} />
          <Stat label="Minutes" value={stats.minutes} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[12px]" style={{ color: MUTED }}>
            {range}
          </span>
          <NavButton
            direction="earlier"
            disabled={earlierDisabled}
            onClick={goEarlier}
            label="Earlier matches"
          />
          <NavButton
            direction="later"
            disabled={laterDisabled}
            onClick={goLater}
            label="Later matches"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          // Presentational to assistive tech: each match's link and full
          // accessible name live on its label under the chart, so a keyboard
          // or screen reader user meets one link per match, not two.
          role="img"
          aria-label="Match ratings"
          className="block w-full"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {formChartGridValues(yDomain).map((v) => (
            <line
              key={`grid-${v}`}
              x1={0}
              x2={VB_W}
              y1={ratingToY(v, yDomain)}
              y2={ratingToY(v, yDomain)}
              stroke="white"
              strokeOpacity={v === emphasisRating ? 0.12 : 0.05}
            />
          ))}
          {visible.map((m, i) => (
            <FormBar
              key={m.id}
              match={m}
              x={PAD_L + i * barWidth}
              width={barWidth}
              top={ratingToY(m.rating, yDomain)}
              baselineY={baselineY}
            />
          ))}
        </svg>
        <FormLabels matches={visible} windowSize={windowSize} />
      </div>
    </figure>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[12px]" style={{ color: MUTED }}>
        {label}
      </span>
      <span className="text-[16px] font-bold tabular-nums" style={{ color: WHITE }}>
        {value}
      </span>
    </span>
  );
}

function NavButton({
  direction,
  disabled,
  onClick,
  label,
}: {
  direction: 'earlier' | 'later';
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  // Chevron geometry taken verbatim from the mock (`prof/page2.py:165-166`).
  const d =
    direction === 'earlier'
      ? 'M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z'
      : 'M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z';
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex size-6 items-center justify-center rounded-[4px] text-[#a29e9e] transition-colors',
        'hover:bg-white/[0.06] hover:text-white focus-visible:bg-white/[0.06] focus-visible:text-white',
        disabled ? 'cursor-default opacity-30' : 'opacity-100'
      )}
    >
      <svg width={16} height={16} viewBox="0 0 256 256" fill="currentColor" aria-hidden>
        <path d={d} />
      </svg>
    </button>
  );
}

/** One match's bar, labels and (when either the bar or its opponent resolves) link. */
function FormBar({
  match,
  x,
  width,
  top,
  baselineY,
}: {
  match: FormChartMatch;
  x: number;
  width: number;
  top: number;
  baselineY: number;
}) {
  const colour = ratingColour(match.rating);
  const cx = x + width / 2;
  const inset = Math.min(7, width / 4);
  const marker = goalAssistMarker(match.goals, match.assists);
  const href = match.href ?? match.opponent.href;
  const bar = (
    <g data-slot="form-bar">
      <title>{match.title}</title>
      <rect
        x={x + inset}
        y={top}
        width={Math.max(0, width - inset * 2)}
        height={Math.max(0, baselineY - top)}
        rx={2}
        fill={colour}
      />
      <text x={cx} y={top - 8} textAnchor="middle" fontSize={13} fontWeight={700} fill={WHITE}>
        {match.rating.toFixed(1)}
      </text>
      {marker && (
        <text
          x={cx}
          y={baselineY - 10}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill={WHITE}
        >
          {marker}
        </text>
      )}
    </g>
  );
  if (!href) return bar;
  // A pointer target only: the label under the bar is the same link for the
  // keyboard and assistive tech (see `FormLabel`).
  return (
    <a href={href} tabIndex={-1} aria-hidden="true">
      {bar}
    </a>
  );
}

/**
 * The opponent and result under each bar, as HTML laid over the same
 * columns as the bars: the side padding and column width are the svg's own
 * (`PAD_L`, one window slot per column) as percentages, so each label sits
 * under its bar at any width.
 */
function FormLabels({ matches, windowSize }: { matches: FormChartMatch[]; windowSize: number }) {
  const inset = `${(PAD_L / VB_W) * 100}%`;
  return (
    <ol
      data-slot="form-chart-labels"
      className="m-0 grid list-none p-0"
      style={{
        gridTemplateColumns: `repeat(${windowSize}, minmax(0, 1fr))`,
        paddingLeft: inset,
        paddingRight: inset,
      }}
    >
      {matches.map((m) => (
        <FormLabel key={m.id} match={m} />
      ))}
    </ol>
  );
}

/**
 * The opponent's three-letter mark under a bar on a narrow chart when it
 * has no crest (or every crest address fails): the first three letters of
 * its short name, "FUL" for Fulham.
 */
export function formOpponentCode(opponent: FormChartOpponent): string {
  const name = opponent.shortLabel || opponent.label;
  return name
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 3)
    .toUpperCase();
}

const LINK_HOVER =
  'transition-colors group-hover:text-[var(--color-red-100,#eb0000)] group-focus-visible:text-[var(--color-red-100,#eb0000)]';

/**
 * One bar's label. Wide (the chart at 36rem and up): the opponent's short
 * name, then "W 3-2, A". Narrow: the crest (or a three-letter mark), then
 * the score, which reads from his side so it carries the result. A name
 * never wraps into its neighbour: it is cut with an ellipsis when even the
 * short form does not fit, and the full name stays in the tooltip and the
 * accessible name. Plain text at rest, BTL red on hover when it links.
 */
function FormLabel({ match }: { match: FormChartMatch }) {
  const sources = match.opponent.crestSources ?? [];
  const [crestIndex, setCrestIndex] = useState(0);
  const crest = sources[crestIndex];
  const href = match.href ?? match.opponent.href;
  const name = match.opponent.shortLabel || match.opponent.label;
  const resultColour = match.result === 'W' ? WHITE : MUTED;
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'hidden w-full truncate text-[12px] leading-4 font-semibold tracking-[-0.2px] @xl:block',
          href && LINK_HOVER
        )}
      >
        {name}
      </span>
      {crest ? (
        <img
          src={crest}
          alt=""
          aria-hidden="true"
          width={18}
          height={18}
          onError={() => setCrestIndex((i) => i + 1)}
          className="block size-[18px] object-contain @xl:hidden"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'block w-full truncate text-[11px] leading-[18px] font-semibold @xl:hidden',
            href && LINK_HOVER
          )}
        >
          {formOpponentCode(match.opponent)}
        </span>
      )}
      <span
        aria-hidden="true"
        className="mt-0.5 hidden w-full truncate text-[11px] leading-4 tabular-nums @xl:block"
        style={{ color: resultColour }}
      >
        {`${match.result} ${match.score}, ${match.venue}`}
      </span>
      <span
        aria-hidden="true"
        className="mt-0.5 block w-full truncate text-[11px] leading-4 tabular-nums @xl:hidden"
        style={{ color: resultColour }}
      >
        {match.score}
      </span>
    </>
  );
  const className = 'flex min-w-0 flex-col items-center text-center text-white no-underline';
  return (
    <li data-slot="form-label" className="min-w-0" title={match.opponent.label}>
      {href ? (
        <a
          href={href}
          aria-label={formBarAccessibleName(match)}
          className={cn(className, 'group rounded-[2px] outline-offset-2')}
        >
          {content}
        </a>
      ) : (
        <span className={className}>
          {content}
          <span className="sr-only">{formBarAccessibleName(match)}</span>
        </span>
      )}
    </li>
  );
}
