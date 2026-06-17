import { useId, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';

/** Which side a shot belongs to. `home` attacks left→right, `away` right→left. */
export type ShotTeam = 'home' | 'away';

/** How a shot ended. Drives the marker fill + bloom. */
export type ShotOutcome = 'goal' | 'saved' | 'off-target' | 'blocked';

/** A single freeze-frame actor, in StatsBomb 120×80 pitch coordinates. */
export interface ShotFreezeFramePlayer {
  /** StatsBomb x (0–120, own goal line → opposition goal line). */
  x: number;
  /** StatsBomb y (0–80, left touchline → right). */
  y: number;
  /** True when the actor is a team-mate of the shooter. */
  teammate: boolean;
  /** True when the actor is the goalkeeper. */
  keeper: boolean;
}

/** A single shot, in StatsBomb 120×80 pitch coordinates. */
export interface Shot {
  /** Stable identifier. */
  id: string;
  /** Side that took the shot. */
  team: ShotTeam;
  /** StatsBomb x (0–120). */
  x: number;
  /** StatsBomb y (0–80). */
  y: number;
  /** Expected-goals value for the chance (0–1). */
  xg: number;
  /** Outcome of the shot. */
  outcome: ShotOutcome;
  /** Shooter display name. */
  player: string;
  /** Match minute. */
  minute: number;
  /** Positions of the other players at the moment of the shot. */
  freezeFrame: ShotFreezeFramePlayer[];
}

export interface ShotMapProps {
  /** Home team display name. */
  homeTeam: string;
  /** Away team display name. */
  awayTeam: string;
  /** Shots to plot. */
  shots: Shot[];
  /** Home accent. Defaults to BTL home red. */
  homeColor?: string;
  /** Away accent. Defaults to BTL away blue. */
  awayColor?: string;
  /** Additional CSS classes on the outer plate. */
  className?: string;
}

const HOME_COLOR = '#eb0000';
const AWAY_COLOR = '#0091eb';

// StatsBomb pitch is 120 (x) × 80 (y); the Pitch primitive is 100 × 100.
const SB_X = 120;
const SB_Y = 80;

/** Normalise a StatsBomb point to 0–100 pitch coords, mirroring the away side. */
function toPitch(x: number, y: number, team: ShotTeam): { x: number; y: number } {
  const px = (x * 100) / SB_X;
  const py = (y * 100) / SB_Y;
  // Home attacks left→right (keep). Away attacks right→left (mirror both axes
  // so the freeze-frame geometry stays coherent relative to the goal).
  return team === 'home' ? { x: px, y: py } : { x: 100 - px, y: 100 - py };
}

/** Marker radius in viewBox units, scaled by xG (small chances stay legible). */
function radiusForXg(xg: number): number {
  const clamped = Math.max(0, Math.min(1, xg));
  return 1.5 + Math.sqrt(clamped) * 3.4;
}

/** Up-to-two initials for the shooter monogram ("Lionel Messi" → "LM"). */
function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

const OUTCOME_LABEL: Record<ShotOutcome, string> = {
  goal: 'Goal',
  saved: 'Saved',
  'off-target': 'Off target',
  blocked: 'Blocked',
};

/**
 * Shot map — an editorial, interactive plot of a match's shots on the BTL dark
 * surface. Each shot is a pitch marker sized by xG and coloured by team; goals
 * bloom and fill. Hovering, focusing, or scrubbing a shot reveals that chance's
 * StatsBomb freeze-frame (opponents as faint dots, the keeper ringed, the
 * shooter marked), fills an xG ring around the shot, and surfaces a callout.
 */
export function ShotMap({
  homeTeam,
  awayTeam,
  shots,
  homeColor = HOME_COLOR,
  awayColor = AWAY_COLOR,
  className,
}: ShotMapProps) {
  const clipPrefix = useId();
  const [activeId, setActiveId] = useState<string | null>(null);

  const colorFor = (team: ShotTeam) => (team === 'home' ? homeColor : awayColor);

  // Shots in minute order drive the timeline strip.
  const ordered = useMemo(() => [...shots].sort((a, b) => a.minute - b.minute), [shots]);

  const active = useMemo(() => shots.find((s) => s.id === activeId) ?? null, [shots, activeId]);

  const tally = useMemo(() => {
    let home = 0;
    let away = 0;
    for (const s of shots) {
      if (s.outcome !== 'goal') continue;
      if (s.team === 'home') home += 1;
      else away += 1;
    }
    return { home, away };
  }, [shots]);

  const totals = useMemo(() => {
    const acc = {
      home: { shots: 0, xg: 0 },
      away: { shots: 0, xg: 0 },
    };
    for (const s of shots) {
      acc[s.team].shots += 1;
      acc[s.team].xg += s.xg;
    }
    return acc;
  }, [shots]);

  return (
    <figure
      className={cn(
        'relative isolate w-full rounded-[14px] border border-white/[0.08]',
        'bg-gradient-to-b from-white/[0.045] to-white/[0.012] p-5',
        'shadow-[0_30px_70px_-32px_rgba(0,0,0,0.75)]',
        className
      )}
      style={{ fontFamily: '"le-monde-journal-std", Georgia, serif' }}
    >
      {/* Red top hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#eb0000]/70 to-transparent" />

      {/* Masthead */}
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#eb0000]/90">Shot Map</div>
          <h3 className="mt-1.5 text-[22px] leading-none text-white/95">
            {homeTeam} <span className="text-white/35">v</span> {awayTeam}
          </h3>
        </div>
        <div
          className="flex shrink-0 items-baseline gap-2 text-[26px] leading-none text-white/90 tabular-nums"
          style={{ fontFamily: '"le-monde-journal-std", Georgia, serif' }}
        >
          <span style={{ color: homeColor }}>{tally.home}</span>
          <span className="text-[16px] text-white/25">–</span>
          <span style={{ color: awayColor }}>{tally.away}</span>
        </div>
      </header>

      {/* Team xG legend */}
      <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/40">
        <LegendChip
          color={homeColor}
          name={homeTeam}
          shots={totals.home.shots}
          xg={totals.home.xg}
        />
        <span className="text-white/25">xG</span>
        <LegendChip
          color={awayColor}
          name={awayTeam}
          shots={totals.away.shots}
          xg={totals.away.xg}
          align="right"
        />
      </div>

      {/* Pitch + shots */}
      <div className="relative">
        <Pitch variant="full" theme="dark">
          {/* Freeze-frame for the active shot, rendered beneath the markers. */}
          {active && <FreezeFrameLayer shot={active} color={colorFor(active.team)} />}

          {shots.map((shot) => {
            const p = toPitch(shot.x, shot.y, shot.team);
            const color = colorFor(shot.team);
            const r = radiusForXg(shot.xg);
            const isGoal = shot.outcome === 'goal';
            const isActive = shot.id === activeId;
            const dimmed = activeId !== null && !isActive;
            const clipId = `${clipPrefix}-shot-${shot.id}`;

            return (
              <motion.g
                key={shot.id}
                role="button"
                tabIndex={0}
                aria-label={`${shot.player}, ${shot.minute}', xG ${shot.xg.toFixed(
                  2
                )}, ${OUTCOME_LABEL[shot.outcome]}`}
                className="cursor-pointer focus:outline-none"
                onMouseEnter={() => setActiveId(shot.id)}
                onMouseLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(shot.id)}
                onBlur={() => setActiveId(null)}
                onClick={() => setActiveId((cur) => (cur === shot.id ? null : shot.id))}
                initial={false}
                animate={{ opacity: dimmed ? 0.22 : 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {/* xG ring — fills around the shot when active. */}
                {isActive && <XgRing cx={p.x} cy={p.y} r={r + 1.8} xg={shot.xg} color={color} />}

                {/* Goal bloom halo. */}
                {isGoal && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r + 2.6}
                    fill={color}
                    opacity={isActive ? 0.28 : 0.16}
                    style={{ filter: 'blur(1.2px)' }}
                  />
                )}

                {/* Marker body. Goals are filled rings; others are hollow with
                    a faint fill so overlapping shots stay readable. */}
                <defs>
                  <clipPath id={clipId}>
                    <circle cx={p.x} cy={p.y} r={r} />
                  </clipPath>
                </defs>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={color}
                  fillOpacity={isGoal ? 0.9 : 0.16}
                  stroke={color}
                  strokeWidth={isGoal ? 0.6 : 0.5}
                  strokeOpacity={0.95}
                />

                {/* Goals carry the shooter monogram. */}
                {isGoal && (
                  <text
                    x={p.x}
                    y={p.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={r * 0.9}
                    fontWeight="bold"
                    fill="#0a0a0a"
                    style={{ pointerEvents: 'none' }}
                  >
                    {monogram(shot.player)}
                  </text>
                )}
              </motion.g>
            );
          })}

          {/* Callout for the active shot, drawn last so it sits on top. */}
          {active && <Callout shot={active} color={colorFor(active.team)} />}
        </Pitch>

        {/* Attack-direction hairlines under the pitch corners. */}
        <div className="pointer-events-none mt-1 flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-white/30">
          <span style={{ color: `${homeColor}cc` }}>{homeTeam} attack →</span>
          <span style={{ color: `${awayColor}cc` }}>← {awayTeam} attack</span>
        </div>
      </div>

      {/* Timeline strip — shots in minute order; click to step through. */}
      <div className="mt-4">
        <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/40">Timeline</div>
        <div role="listbox" aria-label="Shots in minute order" className="flex items-stretch gap-1">
          {ordered.map((shot) => {
            const color = colorFor(shot.team);
            const isGoal = shot.outcome === 'goal';
            const isActive = shot.id === activeId;
            const height = 14 + Math.round(Math.max(0, Math.min(1, shot.xg)) * 30);
            return (
              <button
                key={shot.id}
                type="button"
                role="option"
                aria-selected={isActive}
                aria-label={`${shot.player}, ${shot.minute}', xG ${shot.xg.toFixed(2)}`}
                title={`${shot.player} · ${shot.minute}' · xG ${shot.xg.toFixed(2)}`}
                onMouseEnter={() => setActiveId(shot.id)}
                onMouseLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(shot.id)}
                onBlur={() => setActiveId(null)}
                onClick={() => setActiveId((cur) => (cur === shot.id ? null : shot.id))}
                className="group flex flex-1 flex-col items-center justify-end gap-1 focus:outline-none"
              >
                <span
                  className="w-full rounded-[2px] transition-all duration-200"
                  style={{
                    height,
                    backgroundColor: color,
                    opacity: isActive ? 1 : isGoal ? 0.7 : 0.32,
                    boxShadow: isGoal
                      ? `0 0 8px -1px ${color}`
                      : isActive
                        ? `0 0 6px -1px ${color}`
                        : 'none',
                    outline: isActive ? `1px solid ${color}` : 'none',
                  }}
                />
                <span
                  className={cn(
                    'text-[8px] tabular-nums transition-colors',
                    isActive ? 'text-white/80' : 'text-white/30 group-hover:text-white/60'
                  )}
                >
                  {shot.minute}'
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer hairline + colophon */}
      <div className="mt-4 border-t border-white/[0.08] pt-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Data · StatsBomb</div>
      </div>
    </figure>
  );
}

/** Home/away chip in the legend: swatch, name, shots, summed xG. */
function LegendChip({
  color,
  name,
  shots,
  xg,
  align = 'left',
}: {
  color: string;
  name: string;
  shots: number;
  xg: number;
  align?: 'left' | 'right';
}) {
  return (
    <div
      className={cn('flex items-center gap-2', align === 'right' && 'flex-row-reverse text-right')}
    >
      <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-white/65">{name}</span>
      <span className="text-white/30">·</span>
      <span className="text-white/50 tabular-nums">{shots} shots</span>
      <span className="text-white/30">·</span>
      <span className="tabular-nums" style={{ color: `${color}` }}>
        {xg.toFixed(2)}
      </span>
    </div>
  );
}

/**
 * The active shot's freeze-frame: opponents as faint dots, team-mates fainter
 * still, the keeper ringed, plus a thin line from the shooter to goal.
 */
function FreezeFrameLayer({ shot, color }: { shot: Shot; color: string }) {
  const origin = toPitch(shot.x, shot.y, shot.team);
  // Goal mouth the shot is aimed at, in pitch coords.
  const goal = shot.team === 'home' ? { x: 100, y: 50 } : { x: 0, y: 50 };

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ pointerEvents: 'none' }}
    >
      {/* Shot trajectory toward goal. */}
      <line
        x1={origin.x}
        y1={origin.y}
        x2={goal.x}
        y2={goal.y}
        stroke={color}
        strokeWidth={0.35}
        strokeOpacity={0.45}
        strokeDasharray="1.4 1.2"
      />

      {shot.freezeFrame.map((ff, i) => {
        const p = toPitch(ff.x, ff.y, shot.team);
        if (ff.keeper) {
          return (
            <g key={`ff-${i}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r={1.5}
                fill="none"
                stroke="white"
                strokeWidth={0.5}
                opacity={0.85}
              />
              <circle cx={p.x} cy={p.y} r={0.7} fill="white" opacity={0.85} />
            </g>
          );
        }
        // Opponents brighter than the shooter's team-mates.
        return (
          <circle
            key={`ff-${i}`}
            cx={p.x}
            cy={p.y}
            r={1.1}
            fill="white"
            opacity={ff.teammate ? 0.28 : 0.55}
          />
        );
      })}

      {/* The shooter, marked. */}
      <motion.circle
        cx={origin.x}
        cy={origin.y}
        r={1.7}
        fill={color}
        stroke="white"
        strokeWidth={0.4}
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, ease: 'backOut' }}
        style={{ transformOrigin: `${origin.x}px ${origin.y}px` }}
      />
    </motion.g>
  );
}

/** Animated xG ring: a track + an accent arc that sweeps to the xG fraction. */
function XgRing({
  cx,
  cy,
  r,
  xg,
  color,
}: {
  cx: number;
  cy: number;
  r: number;
  xg: number;
  color: string;
}) {
  const clamped = Math.max(0, Math.min(1, xg));
  const circumference = 2 * Math.PI * r;
  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Faint full track. */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="white"
        strokeOpacity={0.12}
        strokeWidth={0.5}
      />
      {/* Accent arc, rotated to start at 12 o'clock. */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={0.7}
        strokeLinecap="round"
        strokeDasharray={circumference}
        transform={`rotate(-90 ${cx} ${cy})`}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference * (1 - clamped) }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />
    </g>
  );
}

/** Floating callout for the active shot: player · minute · xG · outcome. */
function Callout({ shot, color }: { shot: Shot; color: string }) {
  const p = toPitch(shot.x, shot.y, shot.team);
  // Keep the card inside the pitch: flip side near the right/top edges.
  const flipX = p.x > 62;
  const flipY = p.y < 24;
  const w = 34;
  const h = 11;
  const gap = 3;
  const boxX = flipX ? p.x - w - gap : p.x + gap;
  const boxY = flipY ? p.y + gap : p.y - h - gap;

  return (
    <motion.g
      initial={{ opacity: 0, y: 1.5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{ pointerEvents: 'none' }}
    >
      <rect
        x={boxX}
        y={boxY}
        width={w}
        height={h}
        rx={1.4}
        fill="#0a0a0a"
        fillOpacity={0.92}
        stroke={color}
        strokeOpacity={0.55}
        strokeWidth={0.3}
      />
      {/* Accent tick. */}
      <rect x={boxX} y={boxY} width={1} height={h} rx={0.4} fill={color} />
      <text
        x={boxX + 2.4}
        y={boxY + 4}
        fontSize={2.7}
        fontWeight="bold"
        fill="white"
        style={{ fontFamily: '"le-monde-journal-std", Georgia, serif' }}
      >
        {shot.player}
      </text>
      <text
        x={boxX + 2.4}
        y={boxY + 7.6}
        fontSize={2.2}
        fill="white"
        fillOpacity={0.55}
        style={{ letterSpacing: '0.04em' }}
      >
        {shot.minute}&apos; · xG {shot.xg.toFixed(2)} · {OUTCOME_LABEL[shot.outcome]}
      </text>
    </motion.g>
  );
}
