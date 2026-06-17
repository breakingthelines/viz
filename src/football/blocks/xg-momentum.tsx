import { useId, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '#/lib/utils';

/** A single attempt on goal, the atom of the cumulative-xG race. */
export interface XgMomentumShot {
  /** Match minute the shot was taken (0–95+). */
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
  /** Every shot in the match, in any order — sorted internally by minute. */
  shots: XgMomentumShot[];
  /** Home accent. Defaults to the BTL home red. */
  homeColor?: string;
  /** Away accent. Defaults to the BTL away blue. */
  awayColor?: string;
  /** Additional classes on the outer panel. */
  className?: string;
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
const MAX_MINUTE = 95;

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

const minuteToX = (minute: number): number =>
  PAD_L + (clamp(minute, 0, MAX_MINUTE) / MAX_MINUTE) * PLOT_W;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Last token of a name, for the on-line goal label ("Lionel Messi" → "Messi"). */
function surname(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? name;
}

/**
 * Expected-goals momentum — a cumulative-xG "race" between two sides across the
 * 95 minutes. Each team's line steps up at every shot by that chance's xG, so
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
  shots,
  homeColor = HOME_RED,
  awayColor = AWAY_BLUE,
  className,
}: XgMomentumProps) {
  const uid = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  // The minute the guide is snapped to. `null` = no scrub (resting state).
  const [scrubMinute, setScrubMinute] = useState<number | null>(null);

  const { home, away, yMax, ordered } = useMemo(() => {
    const ordered = [...shots].sort((a, b) => a.minute - b.minute);
    const build = (team: 'home' | 'away', color: string): TeamSeries => {
      let cumulative = 0;
      const steps: Step[] = [];
      for (const shot of ordered) {
        if (shot.team !== team) continue;
        cumulative += shot.xg;
        steps.push({
          shot,
          cumulative,
          x: minuteToX(shot.minute),
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

    const yFor = (cumulative: number): number => PAD_T + PLOT_H - (cumulative / yMax) * PLOT_H;
    for (const s of [...home.steps, ...away.steps]) s.y = yFor(s.cumulative);

    return { home, away, yMax, ordered };
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
    const at = scrubMinute ?? MAX_MINUTE;
    return { home: totalAtMinute(home, at), away: totalAtMinute(away, at) };
  }, [scrubMinute, home, away]);

  const guideX = scrubMinute === null ? null : minuteToX(scrubMinute);

  /** Translate a pointer event to the nearest whole match minute. */
  const handleMove = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    const vbX = ((clientX - rect.left) / rect.width) * VB_W;
    const ratio = clamp((vbX - PAD_L) / PLOT_W, 0, 1);
    setScrubMinute(Math.round(ratio * MAX_MINUTE));
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
          <TeamReadout name={homeTeam} value={readout.home} color={homeColor} />
          <span aria-hidden className="text-white/20">
            ·
          </span>
          <TeamReadout name={awayTeam} value={readout.away} color={awayColor} />
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
            x1={minuteToX(45)}
            x2={minuteToX(45)}
            y1={PAD_T}
            y2={baselineY}
            stroke="white"
            strokeOpacity={0.1}
            strokeWidth={1}
            strokeDasharray="3 5"
          />

          {/* Minute axis ticks. */}
          {[0, 15, 30, 45, 60, 75, 90].map((m) => (
            <text
              key={`tick-${m}`}
              x={minuteToX(m)}
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
            leftPct={(guideX / VB_W) * 100}
          />
        )}
      </div>

      {/* Team key — small data dots + names. */}
      <div className="mt-3 flex items-center gap-4 text-[11px] text-white/60">
        <TeamKey color={homeColor} name={homeTeam} />
        <TeamKey color={awayColor} name={awayTeam} />
      </div>
    </figure>
  );
}

/** Small data key: a colour dot + the team name. */
function TeamKey({ color, name }: { color: string; name: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{name}</span>
    </span>
  );
}

/** Inline header readout: a colour dot + tabular cumulative xG figure. */
function TeamReadout({ name, value, color }: { name: string; value: number; color: string }) {
  return (
    <span className="flex items-center gap-1.5" title={name}>
      <span
        aria-hidden
        className="inline-block size-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="tabular-nums text-white/80">{value.toFixed(2)}</span>
    </span>
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
 * the team colour; otherwise it falls back to a clean filled dot.
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
  const hasImage = typeof step.shot.imageUrl === 'string' && step.shot.imageUrl.length > 0;
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
  leftPct,
}: {
  shot: XgMomentumShot;
  color: string;
  teamName: string;
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
          <span className="text-[11px] text-white/50">
            {shot.minute}
            &apos; · {teamName}
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
