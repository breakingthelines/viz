import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';

/** A single point on the 0–100 pitch scale (x: own goal → opposition goal, y: left → right touchline). */
export interface LinePoint {
  /** x on the 0–100 pitch scale (0 = own goal line, 100 = opposition goal line). */
  x: number;
  /** y on the 0–100 pitch scale (0 = left touchline, 100 = right touchline). */
  y: number;
}

/** One defensive phase — a snapshot of where the lines sit. */
export interface LineHeightPhase {
  /** Short phase label, e.g. "Build-up", "Mid-block", "High press". */
  label: string;
  /** Height of the defensive line in metres from the team's own goal line. */
  lineHeightMeters: number;
  /** Back-line defender positions (typically four), left→right across the pitch. */
  defenders: LinePoint[];
  /** Optional midfield-line positions (typically three), to show the band between lines. */
  midfield?: LinePoint[];
}

export interface LineHeightProps {
  /** Team display name — the plate title. */
  team: string;
  /** Team accent colour. Defaults to the BTL home red. */
  color?: string;
  /** Defensive phases to scrub between, e.g. Build-up → Mid-block → High press. */
  phases: LineHeightPhase[];
  /** Additional CSS classes on the outer plate. */
  className?: string;
}

const ACCENT = '#eb0000';
/** Standard pitch length in metres — used to map metres ↔ pitch x. */
const PITCH_LENGTH_M = 105;

/** Sort a line's points left→right by y so the connecting path never crosses itself. */
function sortByY(points: LinePoint[]): LinePoint[] {
  return [...points].sort((a, b) => a.y - b.y);
}

/** Build a smooth Catmull-Rom-ish path string through the (already y-sorted) points. */
function linePath(points: LinePoint[]): string {
  if (points.length === 0) return '';
  const first = points[0];
  if (!first) return '';
  if (points.length === 1) return `M ${first.x} ${first.y}`;

  let d = `M ${first.x} ${first.y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    if (!p0 || !p1 || !p2 || !p3) continue;
    // Catmull-Rom → cubic Bézier control points (tension 1/6).
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Mean x of a set of points — the line's "average height" on the pitch x-axis. */
function meanX(points: LinePoint[]): number {
  if (points.length === 0) return 0;
  return points.reduce((sum, p) => sum + p.x, 0) / points.length;
}

const spring = { type: 'spring' as const, stiffness: 120, damping: 22, mass: 0.9 };

export function LineHeight({ team, color = ACCENT, phases, className }: LineHeightProps) {
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const clipPrefix = useId();

  const safePhases = phases.length > 0 ? phases : [];
  const index = Math.min(active, Math.max(0, safePhases.length - 1));
  const phase = safePhases[index];

  if (!phase) {
    return (
      <div className={cn('rounded-[14px] border border-white/[0.08] p-5', className)}>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">No phase data</p>
      </div>
    );
  }

  const defenders = sortByY(phase.defenders);
  const midfield = phase.midfield ? sortByY(phase.midfield) : [];
  const hasMidfield = midfield.length > 0;

  const defenceX = meanX(defenders);
  const midfieldX = hasMidfield ? meanX(midfield) : defenceX;
  // Vertical compactness: distance between the two lines, in metres.
  const compactnessM = hasMidfield
    ? Math.round((Math.abs(midfieldX - defenceX) / 100) * PITCH_LENGTH_M)
    : 0;

  // Band polygon: defensive line out to the midfield line, shaded in team colour.
  const bandPath = hasMidfield
    ? `${linePath(defenders)} L ${[...midfield]
        .reverse()
        .map((p) => `${p.x} ${p.y}`)
        .join(' L ')} Z`
    : '';

  const fillId = `${clipPrefix}-band`;

  return (
    <div
      data-slot="line-height"
      className={cn(
        'relative overflow-hidden rounded-[14px] border border-white/[0.08]',
        'bg-gradient-to-b from-white/[0.045] to-white/[0.012] p-5',
        'shadow-[0_30px_70px_-32px_rgba(0,0,0,0.75)]',
        className
      )}
    >
      {/* Faint red top hairline */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${color}, transparent)`,
          opacity: 0.55,
        }}
      />

      {/* Masthead */}
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color }}>
            Defensive Line
          </p>
          <h3
            className="mt-1 text-[22px] leading-none text-white"
            style={{ fontFamily: '"le-monde-journal-std", Georgia, serif' }}
          >
            {team}
          </h3>
        </div>

        {/* Line-height readout — animates to the phase value */}
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Line height</p>
          <p className="mt-0.5 flex items-baseline justify-end gap-1 leading-none text-white">
            <CountingNumber value={phase.lineHeightMeters} className="text-[28px] tabular-nums" />
            <span className="text-[12px] text-white/45">m</span>
          </p>
        </div>
      </header>

      {/* Pitch */}
      <div
        className="relative"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <Pitch variant="full" theme="dark">
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity={0.04} />
              <stop offset="100%" stopColor={color} stopOpacity={0.16} />
            </linearGradient>
          </defs>

          {/* Compactness band between the lines */}
          {hasMidfield && (
            <motion.path
              key="band"
              d={bandPath}
              fill={`url(#${fillId})`}
              stroke="none"
              initial={false}
              animate={{ d: bandPath, opacity: 1 }}
              transition={spring}
            />
          )}

          {/* Own-goal reference tick + the live height marker line */}
          <motion.line
            x1={defenceX}
            x2={defenceX}
            y1={0}
            y2={100}
            stroke={color}
            strokeWidth={0.35}
            strokeDasharray="1.2 1.2"
            initial={false}
            animate={{ x1: defenceX, x2: defenceX, opacity: hovering ? 0.85 : 0.4 }}
            transition={spring}
          />

          {/* Midfield connecting line */}
          {hasMidfield && (
            <motion.path
              key="midfield-line"
              d={linePath(midfield)}
              fill="none"
              stroke="white"
              strokeWidth={0.5}
              strokeOpacity={0.4}
              strokeLinecap="round"
              initial={false}
              animate={{ d: linePath(midfield) }}
              transition={spring}
            />
          )}

          {/* Defensive connecting line */}
          <motion.path
            key="defence-line"
            d={linePath(defenders)}
            fill="none"
            stroke={color}
            strokeWidth={0.8}
            strokeLinecap="round"
            initial={false}
            animate={{ d: linePath(defenders) }}
            transition={spring}
          />

          {/* Midfield markers */}
          {midfield.map((p, i) => (
            <motion.circle
              key={`mid-${i}`}
              r={1.7}
              fill="#0a0a0a"
              stroke="white"
              strokeWidth={0.4}
              strokeOpacity={0.55}
              initial={false}
              animate={{ cx: p.x, cy: p.y }}
              transition={spring}
            />
          ))}

          {/* Defender markers */}
          {defenders.map((p, i) => (
            <motion.circle
              key={`def-${i}`}
              r={2}
              fill={color}
              stroke="white"
              strokeWidth={0.4}
              initial={false}
              animate={{ cx: p.x, cy: p.y }}
              transition={spring}
            />
          ))}
        </Pitch>

        {/* Hover height label */}
        <AnimatePresence>
          {hovering && (
            <motion.div
              className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm tabular-nums"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              Line at {phase.lineHeightMeters}m
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Phase scrubber + compactness readout */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Defensive phase"
          className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5"
        >
          {safePhases.map((p, i) => {
            const selected = i === index;
            return (
              <button
                key={`${p.label}-${i}`}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(i)}
                className={cn(
                  'relative rounded-full px-3 py-1.5 text-[11px] font-medium tracking-tight transition-colors',
                  selected ? 'text-white' : 'text-white/45 hover:text-white/70'
                )}
              >
                {selected && (
                  <motion.span
                    layoutId={`${clipPrefix}-phase-pill`}
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: `${color}26`, border: `1px solid ${color}66` }}
                    transition={spring}
                  />
                )}
                <span className="relative z-10">{p.label}</span>
              </button>
            );
          })}
        </div>

        {hasMidfield && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Compactness</p>
            <p className="mt-0.5 leading-none text-white/85">
              <CountingNumber value={compactnessM} className="text-[15px] tabular-nums" />
              <span className="ml-1 text-[11px] text-white/45">m between lines</span>
            </p>
          </div>
        )}
      </div>

      {/* Colophon */}
      <p className="mt-4 text-[9px] uppercase tracking-[0.25em] text-white/25">Data · StatsBomb</p>
    </div>
  );
}

/** A number that springs/counts to its target value when it changes. */
function CountingNumber({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('relative inline-block overflow-hidden', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="inline-block"
          initial={{ y: '60%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-60%', opacity: 0 }}
          transition={spring}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
