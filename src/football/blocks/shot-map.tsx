import { useId, useMemo, useState, type ReactNode } from 'react';
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
  /**
   * StatsBomb x (0–120) in the shooter's own attacking frame: 0 is the team's
   * own goal line, 120 is the goal it attacks. The block maps `home` to the
   * right-hand goal and `away` to the left-hand goal.
   */
  x: number;
  /** StatsBomb y (0–80), left touchline → right, same frame for both teams. */
  y: number;
  /** Expected-goals value for the chance (0–1). */
  xg: number;
  /** Outcome of the shot. */
  outcome: ShotOutcome;
  /** Shooter display name. */
  player: string;
  /** Shooter headshot URL. When set, the marker shows the photo (monogram fallback). */
  imageUrl?: string;
  /** Match minute. */
  minute: number;
  /** Positions of the other players at the moment of the shot. */
  freezeFrame: ShotFreezeFramePlayer[];
}

/** Which teams' shots are shown. */
export type ShotMapFilter = ShotTeam | 'both';

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
  /** Which side(s) to show. Defaults to `both`. Controlled when paired with `onFilterChange`. */
  filter?: ShotMapFilter;
  /** Notified when the in-block team filter changes. */
  onFilterChange?: (filter: ShotMapFilter) => void;
  /** Additional CSS classes on the outer panel. */
  className?: string;
}

const HOME_COLOR = '#eb0000';
const AWAY_COLOR = '#0091eb';

// StatsBomb pitch is 120 (x) × 80 (y); the Pitch primitive is 100 × 100.
const SB_X = 120;
const SB_Y = 80;

/**
 * Normalise a StatsBomb point to the 0–100 pitch.
 *
 * Both teams' coordinates arrive in their own attacking frame (x→120 is the
 * goal they attack). `home` keeps that orientation and attacks the right-hand
 * goal; `away` mirrors the x-axis only so it attacks the left-hand goal. The
 * y-axis (touchline) is shared, so a shot from the right channel stays on the
 * right for both sides — the geometry reads correctly for a fixed viewer.
 */
function toPitch(x: number, y: number, team: ShotTeam): { x: number; y: number } {
  const px = (x * 100) / SB_X;
  const py = (y * 100) / SB_Y;
  return team === 'home' ? { x: px, y: py } : { x: 100 - px, y: py };
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
 * Shot map — an interactive plot of a match's shots on the BTL dark surface,
 * styled to sit quietly next to the Lineup builder. Each shot is a pitch marker
 * sized by xG and coloured by team; goals bloom and fill. Hovering, focusing, or
 * scrubbing a shot reveals that chance's StatsBomb freeze-frame (opponents as
 * faint dots, the keeper ringed, the shooter marked), fills an xG ring around
 * the shot, and surfaces a callout. A team filter narrows the plot to one side.
 */
export function ShotMap({
  homeTeam,
  awayTeam,
  shots,
  homeColor = HOME_COLOR,
  awayColor = AWAY_COLOR,
  filter: filterProp,
  onFilterChange,
  className,
}: ShotMapProps) {
  const clipPrefix = useId();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Filter is controllable; falls back to local state for a standalone block.
  const [filterState, setFilterState] = useState<ShotMapFilter>('both');
  const filter = filterProp ?? filterState;
  const setFilter = (next: ShotMapFilter) => {
    if (filterProp === undefined) setFilterState(next);
    onFilterChange?.(next);
  };

  const colorFor = (team: ShotTeam) => (team === 'home' ? homeColor : awayColor);

  const shown = useMemo(
    () => (filter === 'both' ? shots : shots.filter((s) => s.team === filter)),
    [shots, filter]
  );

  // Shots in minute order drive the timeline strip.
  const ordered = useMemo(() => [...shown].sort((a, b) => a.minute - b.minute), [shown]);

  const active = useMemo(() => shown.find((s) => s.id === activeId) ?? null, [shown, activeId]);

  const filterOptions: { value: ShotMapFilter; label: string }[] = [
    { value: 'both', label: 'Both teams' },
    { value: 'home', label: homeTeam },
    { value: 'away', label: awayTeam },
  ];
  const filterValueLabel = filterOptions.find((o) => o.value === filter)?.label ?? 'Both teams';

  return (
    <div
      className={cn(
        'my-6 rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4',
        'shadow-[0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-[12px] [border-top-color:rgba(255,255,255,0.10)]',
        className
      )}
    >
      {/* Header: one plain title + clean team-filter dropdown. */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold tracking-tight text-white">Shot map</span>
        <ControlDropdown label="Showing" valueLabel={filterValueLabel}>
          {(close) =>
            filterOptions.map((o) => (
              <DropdownItem
                key={o.value}
                selected={o.value === filter}
                onSelect={() => {
                  setFilter(o.value);
                  close();
                }}
              >
                {o.label}
              </DropdownItem>
            ))
          }
        </ControlDropdown>
      </div>

      {/* Pitch + shots */}
      <div className="relative">
        <Pitch variant="full" theme="dark">
          {/* Freeze-frame for the active shot, rendered beneath the markers. */}
          {active && <FreezeFrameLayer shot={active} color={colorFor(active.team)} />}

          {shown.map((shot) => {
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

                {/* Marker body. With a headshot, the marker is the shooter's
                    photo clipped to the circle; otherwise goals are filled rings
                    and others hollow with a faint fill so overlaps stay readable. */}
                {shot.imageUrl ? (
                  <>
                    <defs>
                      <clipPath id={clipId}>
                        <circle cx={p.x} cy={p.y} r={r} />
                      </clipPath>
                    </defs>
                    <circle cx={p.x} cy={p.y} r={r} fill={color} />
                    <image
                      href={shot.imageUrl}
                      x={p.x - r}
                      y={p.y - r}
                      width={r * 2}
                      height={r * 2}
                      clipPath={`url(#${clipId})`}
                      preserveAspectRatio="xMidYMid slice"
                      style={{ pointerEvents: 'none' }}
                    />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={r}
                      fill="none"
                      stroke={color}
                      strokeWidth={isGoal ? 0.8 : 0.6}
                      strokeOpacity={0.95}
                    />
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </motion.g>
            );
          })}

          {/* Callout for the active shot, drawn last so it sits on top. */}
          {active && <Callout shot={active} color={colorFor(active.team)} />}
        </Pitch>
      </div>

      {/* Team key — small data dots + names (no decorative tracking). */}
      <div className="mt-3 flex items-center gap-4 text-[11px] text-white/60">
        <TeamKey color={homeColor} name={homeTeam} />
        <TeamKey color={awayColor} name={awayTeam} />
      </div>

      {/* Timeline strip — shots in minute order; click to step through. */}
      <div
        role="listbox"
        aria-label="Shots in minute order"
        className="mt-3 flex items-stretch gap-1"
      >
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

// ── Share-menu-style dropdown ────────────────────────────────────────────────
// Mirrors the editor's game-block ControlDropdown look (the anchored share-menu
// trigger + glass content). Self-contained here because viz is a standalone
// AGPL package with no design-system dependency; the classes match the kit.
const TRIGGER_CLS =
  'flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white transition-colors hover:border-white/25';
const CONTENT_CLS =
  'absolute right-0 top-[calc(100%+6px)] z-50 flex min-w-[150px] flex-col gap-0.5 rounded-[8px] border border-white/10 bg-[#161616]/95 p-1 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl';

function ControlDropdown({
  label,
  valueLabel,
  children,
}: {
  label: string;
  valueLabel: ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        className={TRIGGER_CLS}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={(e) => {
          // Close when focus leaves the dropdown entirely.
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
      >
        <span className="text-white/50">{label}</span>
        <span className="font-semibold">{valueLabel}</span>
        <Caret />
      </button>
      {open && (
        <div role="listbox" className={CONTENT_CLS}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onMouseDown={(e) => e.preventDefault()} // keep trigger focus so blur-close doesn't beat the click
      onClick={onSelect}
      className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-[6px] px-2.5 py-1.5 text-left text-[12px] text-white transition-colors hover:bg-white/[0.06]"
    >
      <span className="truncate">{children}</span>
      {selected && <Check />}
    </button>
  );
}

/** Tiny caret glyph (no icon dependency in this package). */
function Caret() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" className="text-white/40">
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Tiny check glyph for the selected dropdown row. */
function Check() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="text-[#eb0000]">
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

/** Floating callout for the active shot: player + minute · xG · outcome. */
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
      <text x={boxX + 2.4} y={boxY + 4} fontSize={2.7} fontWeight="bold" fill="white">
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
