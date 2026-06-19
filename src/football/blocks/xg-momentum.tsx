import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { surname } from '#/football/lib/player-name';
import { PanelFooter } from '#/football/lib/panel-footer';
import { finite } from '#/football/lib/finite';

/** A single attempt on goal, the atom of the cumulative-xG race. */
export interface XgMomentumShot {
  /** Match minute the shot was taken (0–90+ in normal time, up to 120+ in extra time). */
  minute: number;
  /** Which side took it — drives the colour and which line it steps up. */
  team: 'home' | 'away';
  /** Expected-goals value of the chance (0–1). */
  xg: number;
  /** Shooter's name, surfaced in the scrub callout and goal labels. */
  player: string;
  /** What happened to the shot. `goal` is marked on the line. */
  outcome: 'goal' | 'saved' | 'off-target' | 'blocked';
  /** Optional scorer headshot, shown on the goal marker (falls back to a dot). */
  imageUrl?: string;
}

export interface XgMomentumProps {
  /** Home team display name (shown in the team key, coloured red). */
  homeTeam: string;
  /** Away team display name (shown in the team key, coloured blue). */
  awayTeam: string;
  /** Home team crest URL. Rendered as a small badge before the home name. */
  homeCrestUrl?: string;
  /** Away team crest URL. Rendered as a small badge before the away name. */
  awayCrestUrl?: string;
  /** Every shot in the match, in any order — sorted internally by minute. */
  shots: XgMomentumShot[];
  /** Home accent. Defaults to the BTL home red. */
  homeColor?: string;
  /** Away accent. Defaults to the BTL away blue. */
  awayColor?: string;
  /** Additional classes on the outer panel. */
  className?: string;
  /**
   * BTL wordmark for the footer colophon. A design-system-aware host (the
   * editor) passes the real `BtlWordmark`; omitted in Storybook/standalone,
   * where the footer falls back to viz's inlined replica.
   */
  wordmark?: ReactNode;
}

const HOME_RED = '#eb0000';
const AWAY_BLUE = '#0091eb';

/** Plot geometry in viewBox units. The chart draws inside these insets. */
const VB_W = 720;
const VB_H = 360;
const PAD_L = 16;
const PAD_R = 16;
const PAD_T = 18;
const PAD_B = 34;
const PLOT_W = VB_W - PAD_L - PAD_R;
const PLOT_H = VB_H - PAD_T - PAD_B;

/**
 * The x-axis floor: a normal-time match always reads to at least 95' so a 90'
 * shot (plus a little stoppage) sits comfortably inside the plot rather than on
 * the right edge. Extra-time matches extend the domain past this — see
 * {@link xDomainMax}.
 */
const BASE_MAX_MINUTE = 95;

/** Hard ceiling on the domain so a stray bad minute can't blow out the axis. */
const ABSOLUTE_MAX_MINUTE = 135;

/**
 * The right edge of the time axis in minutes, derived from the data. Normal-time
 * matches stay at {@link BASE_MAX_MINUTE}; once a shot lands past 90' (extra
 * time) the domain extends to the last shot's minute plus a small margin so the
 * final attempt isn't jammed against the frame, capped at
 * {@link ABSOLUTE_MAX_MINUTE}. Returns a clean value so the ET ticks land on it.
 */
function xDomainMax(maxShotMinute: number): number {
  if (maxShotMinute <= BASE_MAX_MINUTE) return BASE_MAX_MINUTE;
  // Round up to the next 5' past the last shot for a little headroom, capped.
  const padded = Math.ceil((maxShotMinute + 2) / 5) * 5;
  return Math.min(padded, ABSOLUTE_MAX_MINUTE);
}

/** A shot with its running cumulative xG for that team, in plot coordinates. */
interface Step {
  shot: XgMomentumShot;
  cumulative: number;
  /** x in viewBox units (mapped from minute). */
  x: number;
  /** y in viewBox units (mapped from cumulative xG). */
  y: number;
}

interface TeamSeries {
  team: 'home' | 'away';
  color: string;
  steps: Step[];
  total: number;
}

/** Map a match minute to an x in viewBox units, given the axis domain max. */
const minuteToX = (minute: number, domainMax: number): number =>
  finite(PAD_L + (clamp(minute, 0, domainMax) / domainMax) * PLOT_W, PAD_L);

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Minute-axis ticks across the (possibly extended) domain. Normal time reads in
 * 15' steps to 90'. When the match ran to extra time the domain extends and we
 * add 105' / 120' (and the true end) so the timeline stays legible through ET.
 */
function minuteTicks(domainMax: number): number[] {
  const ticks = [0, 15, 30, 45, 60, 75, 90];
  if (domainMax <= BASE_MAX_MINUTE) return ticks;
  // Extra time: 90' is full-time, then the two ET periods.
  for (const t of [105, 120]) if (t <= domainMax) ticks.push(t);
  // Surface the actual end if it sits clear of the last fixed ET tick.
  const last = ticks[ticks.length - 1] ?? 0;
  if (domainMax - last >= 6) ticks.push(domainMax);
  return ticks;
}

/**
 * Expected-goals momentum — a cumulative-xG "race" between two sides across the
 * match (normal time, and through extra time when it ran that long). Each team's
 * line steps up at every shot by that chance's xG, so
 * the gap between the lines reads as who was creating the better chances and
 * when. Goals are marked with a filled node + the scorer's surname; the lines
 * draw in on mount. Hovering (or dragging) the plot snaps a vertical guide to
 * the nearest minute and reads out both running totals plus a callout for the
 * shot at that moment.
 *
 * A timeline chart — deliberately *not* drawn on a pitch — styled to sit quietly
 * on the BTL dark surface next to the Shot map.
 */
export function XgMomentum({
  homeTeam,
  awayTeam,
  homeCrestUrl,
  awayCrestUrl,
  shots,
  homeColor = HOME_RED,
  awayColor = AWAY_BLUE,
  className,
  wordmark,
}: XgMomentumProps) {
  const uid = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  // The minute the guide is snapped to. `null` = no scrub (resting state).
  const [scrubMinute, setScrubMinute] = useState<number | null>(null);

  const { home, away, yMax, xMax, ordered } = useMemo(() => {
    const ordered = [...shots].sort((a, b) => a.minute - b.minute);
    // The time axis extends to fit the latest shot — through extra time when the
    // match ran past 90'. Derived once here and threaded into every minute→x map.
    const lastMinute = ordered.length > 0 ? finite(ordered[ordered.length - 1]?.minute ?? 0) : 0;
    const xMax = xDomainMax(lastMinute);

    const build = (team: 'home' | 'away', color: string): TeamSeries => {
      let cumulative = 0;
      const steps: Step[] = [];
      for (const shot of ordered) {
        if (shot.team !== team) continue;
        // A missing xG must not poison the running total (NaN would propagate to
        // every later step's y, and to the whole axis ceiling).
        cumulative += finite(shot.xg);
        steps.push({
          shot,
          cumulative,
          x: minuteToX(shot.minute, xMax),
          y: 0, // y filled once yMax is known, below
        });
      }
      return { team, color, steps, total: cumulative };
    };

    const home = build('home', homeColor);
    const away = build('away', awayColor);
    // Round the axis ceiling up to a clean 0.5 so the top line has headroom.
    const peak = Math.max(home.total, away.total, 0.5);
    const yMax = Math.ceil(peak * 2) / 2 + 0.25;

    const yFor = (cumulative: number): number =>
      finite(PAD_T + PLOT_H - (cumulative / yMax) * PLOT_H, PAD_T + PLOT_H);
    for (const s of [...home.steps, ...away.steps]) s.y = yFor(s.cumulative);

    return { home, away, yMax, xMax, ordered };
  }, [shots, homeColor, awayColor]);

  // Both series, back-to-front: away painted first so the home red reads forward.
  const seriesByDepth: TeamSeries[] = [away, home];

  const baselineY = PAD_T + PLOT_H;

  // The shot nearest the scrubbed minute (across both teams) — names the callout.
  const activeShot = useMemo(() => {
    if (scrubMinute === null) return null;
    let best: XgMomentumShot | null = null;
    let bestDist = Infinity;
    for (const shot of ordered) {
      const dist = Math.abs(shot.minute - scrubMinute);
      if (dist < bestDist) {
        best = shot;
        bestDist = dist;
      }
    }
    // Only surface the callout when the guide is genuinely near a shot.
    return best !== null && bestDist <= 4 ? best : null;
  }, [scrubMinute, ordered]);

  // Cumulative totals for each team *as of* the scrubbed minute (the readout).
  const readout = useMemo(() => {
    const at = scrubMinute ?? xMax;
    return { home: totalAtMinute(home, at), away: totalAtMinute(away, at) };
  }, [scrubMinute, home, away, xMax]);

  const guideX = scrubMinute === null ? null : minuteToX(scrubMinute, xMax);

  /** Translate a pointer event to the nearest whole match minute. */
  const handleMove = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    const vbX = ((clientX - rect.left) / rect.width) * VB_W;
    const ratio = clamp((vbX - PAD_L) / PLOT_W, 0, 1);
    setScrubMinute(Math.round(ratio * xMax));
  };

  return (
    <figure
      data-slot="xg-momentum"
      className={cn(
        'my-6 rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4',
        'shadow-[0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-[12px] [border-top-color:rgba(255,255,255,0.10)]',
        className
      )}
    >
      {/* Header: one plain title + a small inline cumulative-xG readout. */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold tracking-tight text-white">Expected goals</span>
        <div className="flex shrink-0 items-center gap-2.5 text-[11px] text-white/60">
          <TeamReadout
            name={homeTeam}
            value={readout.home}
            color={homeColor}
            crestUrl={homeCrestUrl}
          />
          <span aria-hidden className="text-white/20">
            ·
          </span>
          <TeamReadout
            name={awayTeam}
            value={readout.away}
            color={awayColor}
            crestUrl={awayCrestUrl}
          />
        </div>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block w-full touch-none select-none"
          role="img"
          aria-label={`Cumulative expected goals over time: ${homeTeam} ${home.total.toFixed(
            2
          )}, ${awayTeam} ${away.total.toFixed(2)}`}
          onPointerMove={(e) => handleMove(e.clientX)}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            handleMove(e.clientX);
          }}
          onPointerLeave={() => setScrubMinute(null)}
        >
          <defs>
            {seriesByDepth.map((s) => (
              <linearGradient
                key={`grad-${s.team}`}
                id={`${uid}-fill-${s.team}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          {/* Horizontal gridlines at each 0.5 xG, with quiet value labels. */}
          {gridValues(yMax).map((v) => {
            const y = PAD_T + PLOT_H - (v / yMax) * PLOT_H;
            return (
              <g key={`grid-${v}`}>
                <line
                  x1={PAD_L}
                  x2={PAD_L + PLOT_W}
                  y1={y}
                  y2={y}
                  stroke="white"
                  strokeOpacity={v === 0 ? 0.16 : 0.06}
                  strokeWidth={1}
                />
                <text
                  x={PAD_L + 2}
                  y={y - 4}
                  fill="white"
                  fillOpacity={0.28}
                  fontSize={10}
                  className="tabular-nums"
                >
                  {v.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Half-time marker — a quiet dashed divider at 45'. */}
          <line
            x1={minuteToX(45, xMax)}
            x2={minuteToX(45, xMax)}
            y1={PAD_T}
            y2={baselineY}
            stroke="white"
            strokeOpacity={0.1}
            strokeWidth={1}
            strokeDasharray="3 5"
          />

          {/* Full-time divider at 90' — only when the match ran to extra time, to
              set the ET periods apart from normal time. */}
          {xMax > BASE_MAX_MINUTE && (
            <line
              x1={minuteToX(90, xMax)}
              x2={minuteToX(90, xMax)}
              y1={PAD_T}
              y2={baselineY}
              stroke="white"
              strokeOpacity={0.1}
              strokeWidth={1}
              strokeDasharray="3 5"
            />
          )}

          {/* Minute axis ticks — extended through extra time when present. */}
          {minuteTicks(xMax).map((m) => (
            <text
              key={`tick-${m}`}
              x={minuteToX(m, xMax)}
              y={baselineY + 20}
              textAnchor="middle"
              fill="white"
              fillOpacity={0.4}
              fontSize={10}
              className="tabular-nums"
            >
              {m}
              {m === 0 ? '' : "'"}
            </text>
          ))}

          {/* Each team's stepped area + drawn-in line. Away painted first so the
              home red reads forward where the lines overlap. */}
          {seriesByDepth.map((s) => (
            <TeamPath
              key={`path-${s.team}`}
              series={s}
              baselineY={baselineY}
              fillId={`${uid}-fill-${s.team}`}
            />
          ))}

          {/* Goal nodes — filled discs (or scorer headshot) + scorer surname. */}
          {seriesByDepth.flatMap((s) =>
            s.steps
              .filter((step) => step.shot.outcome === 'goal')
              .map((step, i) => (
                <GoalNode
                  key={`goal-${s.team}-${i}`}
                  step={step}
                  color={s.color}
                  label={surname(step.shot.player)}
                  clipId={`${uid}-head-${s.team}-${i}`}
                />
              ))
          )}

          {/* Scrub guide: vertical line + node where it crosses each team line. */}
          {guideX !== null && (
            <g pointerEvents="none">
              <line
                x1={guideX}
                x2={guideX}
                y1={PAD_T - 2}
                y2={baselineY}
                stroke="white"
                strokeOpacity={0.5}
                strokeWidth={1}
              />
              {seriesByDepth.map((s) => {
                const cy = lineYAtMinute(s, scrubMinute ?? 0);
                return (
                  <circle
                    key={`cursor-${s.team}`}
                    cx={guideX}
                    cy={cy}
                    r={4}
                    fill="#0a0a0a"
                    stroke={s.color}
                    strokeWidth={2}
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* Scrub callout — names the shot nearest the guide. Overlaid, follows
            the guide horizontally, flips side near the right edge. */}
        {activeShot && guideX !== null && (
          <ShotCallout
            shot={activeShot}
            color={activeShot.team === 'home' ? homeColor : awayColor}
            teamName={activeShot.team === 'home' ? homeTeam : awayTeam}
            crestUrl={activeShot.team === 'home' ? homeCrestUrl : awayCrestUrl}
            leftPct={(guideX / VB_W) * 100}
          />
        )}
      </div>

      {/* Team key — small data dots + names. */}
      <div className="mt-3 flex items-center gap-4 text-[11px] text-white/90">
        <TeamKey color={homeColor} name={homeTeam} crestUrl={homeCrestUrl} />
        <TeamKey color={awayColor} name={awayTeam} crestUrl={awayCrestUrl} />
      </div>

      <PanelFooter provider="statsbomb" wordmark={wordmark} />
    </figure>
  );
}

/** Small data key: a colour dot + optional crest + the team name. */
function TeamKey({ color, name, crestUrl }: { color: string; name: string; crestUrl?: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
      <Crest url={crestUrl} name={name} />
      <span className="truncate">{name}</span>
    </span>
  );
}

/** Inline header readout: a colour dot + optional crest + tabular cumulative xG. */
function TeamReadout({
  name,
  value,
  color,
  crestUrl,
}: {
  name: string;
  value: number;
  color: string;
  crestUrl?: string;
}) {
  return (
    <span className="flex items-center gap-1.5" title={name}>
      <span
        aria-hidden
        className="inline-block size-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <Crest url={crestUrl} name={name} />
      <span className="tabular-nums text-white/80">{value.toFixed(2)}</span>
    </span>
  );
}

/** Small ~16px team crest rendered before a team name. Nothing when absent. */
function Crest({ url, name }: { url?: string; name: string }) {
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      aria-hidden
      width={16}
      height={16}
      className="inline-block size-4 rounded object-contain align-middle"
      title={name}
    />
  );
}

/** A team's drawn-in stepped area + line. The line animates its `pathLength`. */
function TeamPath({
  series,
  baselineY,
  fillId,
}: {
  series: TeamSeries;
  baselineY: number;
  fillId: string;
}) {
  const last = series.steps.at(-1);
  if (!last) return null;

  const start = PAD_L;
  const line = buildStepPath(series.steps, start);
  // Area = the same step path, dropped to the baseline and closed.
  const area = `${line} L ${last.x.toFixed(2)} ${baselineY.toFixed(
    2
  )} L ${start.toFixed(2)} ${baselineY.toFixed(2)} Z`;

  return (
    <g>
      <motion.path
        d={area}
        fill={`url(#${fillId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke={series.color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.15, ease: [0.22, 0.61, 0.36, 1] }}
      />
    </g>
  );
}

/**
 * A goal: a node on the line with the scorer's surname above it. When the shot
 * carries an `imageUrl`, the node becomes a small circular headshot ringed in
 * the team colour; when there's no photo — or the supplied one fails to load —
 * it falls back to a clean filled dot (the surname above still names the scorer).
 */
function GoalNode({
  step,
  color,
  label,
  clipId,
}: {
  step: Step;
  color: string;
  label: string;
  clipId: string;
}) {
  const [failed, setFailed] = useState(false);
  const hasImage =
    typeof step.shot.imageUrl === 'string' && step.shot.imageUrl.length > 0 && !failed;
  const headR = 7;
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 1.0, ease: 'backOut' }}
      style={{ transformOrigin: `${step.x}px ${step.y}px` }}
    >
      {hasImage ? (
        <>
          <defs>
            <clipPath id={clipId}>
              <circle cx={step.x} cy={step.y} r={headR} />
            </clipPath>
          </defs>
          {/* Soft team-colour bloom behind the headshot. */}
          <circle cx={step.x} cy={step.y} r={headR + 2} fill={color} fillOpacity={0.18} />
          <image
            href={step.shot.imageUrl}
            x={step.x - headR}
            y={step.y - headR}
            width={headR * 2}
            height={headR * 2}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
            // Missing/404 photo → fall back to the filled dot below.
            onError={() => setFailed(true)}
          />
          {/* Team-colour ring + dark seam so it reads on either line. */}
          <circle cx={step.x} cy={step.y} r={headR} fill="none" stroke={color} strokeWidth={1.5} />
        </>
      ) : (
        <>
          <circle cx={step.x} cy={step.y} r={6.5} fill={color} fillOpacity={0.18} />
          <circle cx={step.x} cy={step.y} r={3.5} fill={color} stroke="#0a0a0a" strokeWidth={1.5} />
        </>
      )}
      <text
        x={step.x}
        y={step.y - (hasImage ? headR + 5 : 11)}
        textAnchor="middle"
        fill="white"
        fontSize={11}
        fontWeight={600}
      >
        {label}
      </text>
    </motion.g>
  );
}

/** The floating callout naming the shot nearest the scrub guide. */
function ShotCallout({
  shot,
  color,
  teamName,
  crestUrl,
  leftPct,
}: {
  shot: XgMomentumShot;
  color: string;
  teamName: string;
  crestUrl?: string;
  leftPct: number;
}) {
  const flip = leftPct > 62;
  return (
    <motion.div
      key={`${shot.player}-${shot.minute}`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="pointer-events-none absolute top-1 z-10 w-max max-w-[220px]"
      style={{
        left: `${leftPct}%`,
        transform: flip ? 'translateX(-100%)' : 'translateX(0)',
        marginLeft: flip ? -10 : 10,
      }}
    >
      <div className="rounded-[10px] border border-white/10 bg-[#161616]/95 px-3 py-2 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block size-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="flex items-center gap-1.5 text-[11px] text-white/50">
            <span>{shot.minute}&apos; ·</span>
            <Crest url={crestUrl} name={teamName} />
            <span>{teamName}</span>
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-tight text-white">{shot.player}</p>
        <p className="mt-0.5 flex items-baseline gap-2 text-[11px] text-white/55">
          <span className="tabular-nums text-white/80">{shot.xg.toFixed(2)} xG</span>
          <span aria-hidden className="text-white/20">
            ·
          </span>
          <span
            className={cn(shot.outcome === 'goal' && 'text-white')}
            style={shot.outcome === 'goal' ? { color } : undefined}
          >
            {outcomeLabel(shot.outcome)}
          </span>
        </p>
      </div>
    </motion.div>
  );
}

/** Build an SVG "step" path: horizontal hold to each shot's minute, then a
 * vertical jump up by its xG. Starts on the baseline at kickoff. */
function buildStepPath(steps: Step[], startX: number): string {
  if (steps.length === 0) return '';
  const baselineY = PAD_T + PLOT_H;
  const parts: string[] = [`M ${startX.toFixed(2)} ${baselineY.toFixed(2)}`];
  let prevY = baselineY;
  for (const step of steps) {
    parts.push(`L ${step.x.toFixed(2)} ${prevY.toFixed(2)}`); // hold flat to the minute
    parts.push(`L ${step.x.toFixed(2)} ${step.y.toFixed(2)}`); // jump up by the xG
    prevY = step.y;
  }
  return parts.join(' ');
}

/** y (viewBox) of a team's cumulative line at a given minute — for the cursor
 * node. Steps are a right-continuous staircase: value holds until the next shot. */
function lineYAtMinute(series: TeamSeries, minute: number): number {
  let y = PAD_T + PLOT_H; // baseline before the first shot
  for (const step of series.steps) {
    if (step.shot.minute <= minute) y = step.y;
    else break;
  }
  return y;
}

/** Cumulative xG a team has reached by a given minute (the header readout). */
function totalAtMinute(series: TeamSeries, minute: number): number {
  let total = 0;
  for (const step of series.steps) {
    if (step.shot.minute <= minute) total = step.cumulative;
    else break;
  }
  return total;
}

/** Axis tick values: 0 up to yMax in 0.5 steps. */
function gridValues(yMax: number): number[] {
  const out: number[] = [];
  for (let v = 0; v <= yMax + 1e-9; v += 0.5) out.push(Number(v.toFixed(1)));
  return out;
}

function outcomeLabel(outcome: XgMomentumShot['outcome']): string {
  switch (outcome) {
    case 'goal':
      return 'Goal';
    case 'saved':
      return 'Saved';
    case 'off-target':
      return 'Off target';
    case 'blocked':
      return 'Blocked';
  }
}
