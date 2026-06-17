import { useId, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';

/** Which side the moment's actor belongs to. `home` attacks left→right. */
export type MomentTeam = 'home' | 'away';

/** The on-ball event being frozen. */
export interface MomentEvent {
  /** Event type, e.g. "Pass", "Carry", "Through Ball". */
  type: string;
  /** Actor (ball-carrier) display name. */
  player: string;
  /** Which side the actor plays for. */
  team: MomentTeam;
  /** Match minute. */
  minute: number;
}

/** A point in StatsBomb 120×80 pitch coordinates. */
export interface MomentPoint {
  /** StatsBomb x (0–120, own goal line → opposition goal line). */
  x: number;
  /** StatsBomb y (0–80, left touchline → right). */
  y: number;
}

/** One of the other twenty-one players in the 360 freeze-frame. */
export interface MomentPlayer extends MomentPoint {
  /** True when this player is a team-mate of the actor. */
  teammate: boolean;
  /** True when this player is a goalkeeper. */
  keeper: boolean;
}

/** A pass the actor could play, with whether the receiver is in space. */
export interface MomentPassingOption extends MomentPoint {
  /**
   * True when the receiver is genuinely free — behind or between the lines.
   * These lanes glow in the team colour and carry a "space" halo.
   */
  inSpace: boolean;
  /** Optional receiver name, surfaced in the lane callout on hover. */
  player?: string;
}

export interface Moment360Props {
  /** The on-ball event being frozen. */
  event: MomentEvent;
  /** The ball-carrier's position. */
  actor: MomentPoint;
  /** Every other tracked player at the instant of the freeze-frame. */
  players: MomentPlayer[];
  /**
   * The polygon the broadcast camera tracked — the lit zone. Everything
   * outside it is dimmed and desaturated ("what they saw"). StatsBomb coords.
   */
  visibleArea: MomentPoint[];
  /** Passes the actor could play from this position. */
  passingOptions?: MomentPassingOption[];
  /** Kicker over the title. Defaults to "The Moment". */
  kicker?: string;
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
function toPitch(p: MomentPoint, team: MomentTeam): { x: number; y: number } {
  const px = (p.x * 100) / SB_X;
  const py = (p.y * 100) / SB_Y;
  // Home attacks left→right (keep). Away attacks right→left (mirror both axes
  // so the camera geometry reads coherently toward the goal being attacked).
  return team === 'home' ? { x: px, y: py } : { x: 100 - px, y: 100 - py };
}

/** Last token of a name, for the lane callout ("Lionel Messi" → "Messi"). */
function surname(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? name;
}

/** Build an SVG polygon point string from normalised points. */
function toPolygon(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

// Reveal choreography (seconds): the lit area fades up, the world settles in,
// players stagger, then the lanes draw. Calm and filmic.
const T_AREA = 0.9;
const T_FIELD = 0.5;
const T_PLAYER_BASE = 0.95;
const T_PLAYER_STEP = 0.045;
const T_LANES = 1.7;

/**
 * The Moment — a cinematic 360 freeze-frame on the BTL dark surface: the still
 * the broadcast camera held, reframed as "what the player saw". The tracked
 * camera polygon is the lit zone; everything outside it is dimmed and
 * desaturated. Team-mates wear the team colour, opponents cool grey, the keeper
 * is ringed, and the ball-carrier pulses with the ball at their feet. Dashed
 * passing lanes fan out to the options the actor had — the runs in behind glow
 * and halo, the covered balls stay faint. Hovering a lane emphasises it.
 */
export function Moment360({
  event,
  actor,
  players,
  visibleArea,
  passingOptions = [],
  kicker = 'The Moment',
  homeColor = HOME_COLOR,
  awayColor = AWAY_COLOR,
  className,
}: Moment360Props) {
  const maskId = useId();
  const desatId = useId();
  const glowId = useId();
  const [hoverLane, setHoverLane] = useState<number | null>(null);

  const accent = event.team === 'home' ? homeColor : awayColor;

  const origin = useMemo(() => toPitch(actor, event.team), [actor, event.team]);

  const litPolygon = useMemo(
    () => toPolygon(visibleArea.map((p) => toPitch(p, event.team))),
    [visibleArea, event.team]
  );

  const lanes = useMemo(
    () =>
      passingOptions.map((opt) => ({
        opt,
        target: toPitch(opt, event.team),
      })),
    [passingOptions, event.team]
  );

  const spaceCount = useMemo(
    () => passingOptions.filter((o) => o.inSpace).length,
    [passingOptions]
  );

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
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#eb0000]/90">{kicker}</div>
          <h3 className="mt-1.5 text-[22px] leading-none text-white/95">
            {event.player}{' '}
            <span className="tabular-nums text-white/35">· {event.minute}&apos;</span>
          </h3>
        </div>
        <div className="shrink-0 text-right text-[10px] uppercase leading-relaxed tracking-[0.2em] text-white/40">
          <div style={{ color: `${accent}dd` }}>{event.type}</div>
          <div className="mt-0.5 tabular-nums text-white/35">
            {spaceCount > 0 ? `${spaceCount} in space` : 'Pressed'}
          </div>
        </div>
      </header>

      {/* The freeze-frame still */}
      <div className="relative">
        <Pitch variant="full" theme="dark">
          <defs>
            {/* Clip: the lit zone the camera tracked. */}
            <clipPath id={maskId}>
              <polygon points={litPolygon} />
            </clipPath>
            {/* Desaturate filter for the out-of-shot world. */}
            <filter id={desatId}>
              <feColorMatrix type="saturate" values="0" />
            </filter>
            {/* Soft bloom for in-space receivers + the live ball. */}
            <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="1.3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* (1) Out-of-shot world: every player rendered cool + dim, drawn
              first so the lit overlay sits on top. The whole layer is
              desaturated. */}
          <motion.g
            filter={`url(#${desatId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.16 }}
            transition={{ duration: T_FIELD, ease: 'easeOut' }}
            style={{ pointerEvents: 'none' }}
          >
            {players.map((pl, i) => {
              const p = toPitch(pl, event.team);
              return (
                <circle key={`dim-${i}`} cx={p.x} cy={p.y} r={1.3} fill="white" opacity={0.7} />
              );
            })}
          </motion.g>

          {/* (2) The lit zone: a faint warm wash + crisp edge marking the
              camera's tracked area. Fades up first. */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: T_AREA, ease: 'easeOut' }}
            style={{ pointerEvents: 'none' }}
          >
            <polygon
              points={litPolygon}
              fill="white"
              fillOpacity={0.035}
              stroke="white"
              strokeOpacity={0.14}
              strokeWidth={0.3}
              strokeDasharray="1.6 1.4"
            />
          </motion.g>

          {/* (3) Players inside the lit zone — full colour, clipped to the lit
              polygon so only the tracked actors are bright. Staggered reveal. */}
          <g clipPath={`url(#${maskId})`}>
            {players.map((pl, i) => {
              const p = toPitch(pl, event.team);
              const delay = T_PLAYER_BASE + i * T_PLAYER_STEP;

              if (pl.keeper) {
                return (
                  <motion.g
                    key={`lit-${i}`}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.45, ease: 'backOut', delay }}
                    style={{ transformOrigin: `${p.x}px ${p.y}px`, pointerEvents: 'none' }}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={1.7}
                      fill="none"
                      stroke="white"
                      strokeWidth={0.5}
                      opacity={0.9}
                    />
                    <circle cx={p.x} cy={p.y} r={0.8} fill="white" opacity={0.9} />
                  </motion.g>
                );
              }

              // Team-mates in team colour; opponents cool white/grey.
              return (
                <motion.circle
                  key={`lit-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={pl.teammate ? 1.5 : 1.4}
                  fill={pl.teammate ? accent : '#c9d4de'}
                  fillOpacity={pl.teammate ? 0.95 : 0.7}
                  stroke={pl.teammate ? 'white' : 'none'}
                  strokeWidth={pl.teammate ? 0.3 : 0}
                  strokeOpacity={0.6}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: 'backOut', delay }}
                  style={{ transformOrigin: `${p.x}px ${p.y}px`, pointerEvents: 'none' }}
                />
              );
            })}
          </g>

          {/* (4) Passing lanes — drawn last, after the players have settled. */}
          <g>
            {lanes.map(({ opt, target }, i) => {
              const isHover = hoverLane === i;
              const dimmedByHover = hoverLane !== null && !isHover;
              const live = opt.inSpace;
              const laneColor = live ? accent : 'white';
              const baseOpacity = live ? 0.7 : 0.32;
              const opacity = dimmedByHover ? 0.14 : isHover ? 1 : baseOpacity;

              return (
                <motion.g
                  key={`lane-${i}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Pass to ${
                    opt.player ? opt.player : `option ${i + 1}`
                  }${live ? ', in space' : ', covered'}`}
                  className="cursor-pointer focus:outline-none"
                  onMouseEnter={() => setHoverLane(i)}
                  onMouseLeave={() => setHoverLane(null)}
                  onFocus={() => setHoverLane(i)}
                  onBlur={() => setHoverLane(null)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity }}
                  transition={{
                    duration: 0.5,
                    ease: 'easeOut',
                    delay: dimmedByHover || isHover ? 0 : T_LANES + i * 0.12,
                  }}
                >
                  {/* Soft "space" halo behind an in-space receiver. */}
                  {live && (
                    <motion.circle
                      cx={target.x}
                      cy={target.y}
                      r={3.4}
                      fill={accent}
                      filter={`url(#${glowId})`}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{
                        opacity: isHover ? 0.32 : 0.18,
                        scale: 1,
                      }}
                      transition={{
                        duration: 0.6,
                        ease: 'easeOut',
                        delay: isHover ? 0 : T_LANES + i * 0.12 + 0.1,
                      }}
                      style={{ transformOrigin: `${target.x}px ${target.y}px` }}
                    />
                  )}

                  {/* The lane itself — dashed, drawn from actor to receiver. */}
                  <motion.line
                    x1={origin.x}
                    y1={origin.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={laneColor}
                    strokeWidth={isHover ? 0.6 : live ? 0.5 : 0.35}
                    strokeOpacity={0.95}
                    strokeLinecap="round"
                    strokeDasharray="1.4 1.3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: 0.55,
                      ease: 'easeOut',
                      delay: T_LANES + i * 0.12,
                    }}
                  />

                  {/* Receiver node at the lane's end. */}
                  <circle
                    cx={target.x}
                    cy={target.y}
                    r={live ? 1.3 : 1}
                    fill={live ? accent : 'none'}
                    fillOpacity={0.95}
                    stroke={live ? 'white' : laneColor}
                    strokeWidth={0.35}
                    strokeOpacity={live ? 0.7 : 0.6}
                  />

                  {/* Lane callout on hover. */}
                  {isHover && (
                    <LaneCallout
                      x={target.x}
                      y={target.y}
                      label={opt.player ? surname(opt.player) : `Option ${i + 1}`}
                      sub={live ? 'In space' : 'Covered'}
                      color={live ? accent : 'white'}
                    />
                  )}
                </motion.g>
              );
            })}
          </g>

          {/* (5) The actor — ball-carrier, highlighted with a subtle pulse and
              the ball at their feet. Sits above everything. */}
          <motion.g
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'backOut', delay: T_PLAYER_BASE - 0.1 }}
            style={{ transformOrigin: `${origin.x}px ${origin.y}px`, pointerEvents: 'none' }}
          >
            {/* Slow breathing pulse ring. */}
            <motion.circle
              cx={origin.x}
              cy={origin.y}
              r={2.4}
              fill="none"
              stroke={accent}
              strokeWidth={0.4}
              animate={{ r: [2.4, 4.2], opacity: [0.5, 0] }}
              transition={{
                duration: 2.4,
                ease: 'easeOut',
                repeat: Infinity,
                repeatDelay: 0.4,
                delay: T_PLAYER_BASE + 0.3,
              }}
            />
            {/* Actor marker. */}
            <circle
              cx={origin.x}
              cy={origin.y}
              r={2}
              fill={accent}
              stroke="white"
              strokeWidth={0.5}
              filter={`url(#${glowId})`}
            />
            {/* The ball, just off the carrying foot. */}
            <circle
              cx={origin.x + 1.7}
              cy={origin.y + 1.4}
              r={0.85}
              fill="white"
              stroke="#0a0a0a"
              strokeWidth={0.2}
            />
          </motion.g>
        </Pitch>

        {/* Direction + read line under the pitch. */}
        <div className="pointer-events-none mt-1 flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-white/30">
          <span style={{ color: `${accent}cc` }}>
            {event.team === 'home' ? `Attack →` : `← Attack`}
          </span>
          <span>360 freeze-frame</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] uppercase tracking-[0.2em] text-white/40">
        <LegendDot color={accent} label="Team-mate" />
        <LegendDot color="#c9d4de" label="Opponent" ring />
        <LegendDot color="transparent" label="Keeper" hollow />
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-px w-4"
            style={{
              backgroundImage: `repeating-linear-gradient(to right, ${accent} 0 3px, transparent 3px 5px)`,
            }}
          />
          <span className="text-white/55">In-space pass</span>
        </span>
      </div>

      {/* Footer hairline + colophon */}
      <div className="mt-4 border-t border-white/[0.08] pt-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Data · StatsBomb</div>
      </div>
    </figure>
  );
}

/** A swatch + label chip for the legend. */
function LegendDot({
  color,
  label,
  ring = false,
  hollow = false,
}: {
  color: string;
  label: string;
  ring?: boolean;
  hollow?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block size-2 rounded-full"
        style={{
          backgroundColor: hollow ? 'transparent' : color,
          border: hollow
            ? '1px solid rgba(255,255,255,0.85)'
            : ring
              ? '1px solid rgba(255,255,255,0.5)'
              : 'none',
        }}
      />
      <span className="text-white/55">{label}</span>
    </span>
  );
}

/** Floating callout at a passing lane's receiver: name + space state. */
function LaneCallout({
  x,
  y,
  label,
  sub,
  color,
}: {
  x: number;
  y: number;
  label: string;
  sub: string;
  color: string;
}) {
  // Keep the card inside the pitch: flip near the right/top edges.
  const flipX = x > 64;
  const flipY = y < 16;
  const w = 26;
  const h = 9.5;
  const gap = 2.6;
  const boxX = flipX ? x - w - gap : x + gap;
  const boxY = flipY ? y + gap : y - h - gap;

  return (
    <motion.g
      initial={{ opacity: 0, y: 1.2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{ pointerEvents: 'none' }}
    >
      <rect
        x={boxX}
        y={boxY}
        width={w}
        height={h}
        rx={1.2}
        fill="#0a0a0a"
        fillOpacity={0.92}
        stroke={color}
        strokeOpacity={0.55}
        strokeWidth={0.3}
      />
      {/* Accent tick. */}
      <rect x={boxX} y={boxY} width={0.9} height={h} rx={0.4} fill={color} />
      <text
        x={boxX + 2.2}
        y={boxY + 3.7}
        fontSize={2.6}
        fontWeight="bold"
        fill="white"
        style={{ fontFamily: '"le-monde-journal-std", Georgia, serif' }}
      >
        {label}
      </text>
      <text
        x={boxX + 2.2}
        y={boxY + 7}
        fontSize={2}
        fill="white"
        fillOpacity={0.55}
        style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}
      >
        {sub}
      </text>
    </motion.g>
  );
}
