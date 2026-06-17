import { useId, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';

/** The ordered stages a possession sequence can reach as it climbs the pitch. */
export type PhaseKey = 'build_up' | 'progression' | 'final_third' | 'shot';

/** A single stage in the possession funnel. */
export interface Phase {
  /** Stable stage identifier; also drives which third of the pitch lights up. */
  key: PhaseKey;
  /** Short display label ("Build-up", "Progression", …). */
  label: string;
  /** How many sequences reached this stage. Should be monotonically non-increasing. */
  sequences: number;
}

export interface PhasesOfPlayProps {
  /** Team display name. */
  team: string;
  /** Team accent. Defaults to BTL home red. */
  color?: string;
  /** The funnel stages, in build-up → shot order. */
  phases: Phase[];
  /** Additional CSS classes on the outer panel. */
  className?: string;
}

const TEAM_COLOR = '#eb0000';

// The Pitch primitive is 0–100 in x; the attacking direction is left → right.
// The defensive/middle/attacking thirds split the x-axis into equal bands.
const THIRD = 100 / 3;

/**
 * Which third a stage occupies. Build-up sits in the team's own (defensive)
 * third, progression in the middle, and both final-third entries and shots
 * resolve in the attacking third — so the pitch shading walks up the pitch as
 * the funnel narrows.
 */
const PHASE_THIRD: Record<PhaseKey, 0 | 1 | 2> = {
  build_up: 0,
  progression: 1,
  final_third: 2,
  shot: 2,
};

/** Clamp a value into [0, 1]. */
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Conversion from one stage to the next as a fraction (0–1). Guards a zero or
 * missing previous count so an empty funnel doesn't produce NaN/Infinity.
 */
function conversion(prev: number | undefined, curr: number): number {
  if (prev === undefined || prev <= 0) return 0;
  return clamp01(curr / prev);
}

/** Format a fraction as a whole-number percentage ("0.41" → "41%"). */
function pct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/**
 * Phases of play — how a team turns possession into shots, stage by stage. The
 * funnel of sequences (build-up → progression → final third → shot) is read as
 * a stepped bar beside a thirds-zoned pitch: each third shades to the team
 * colour by how much activity flows through it, and the bars fill on mount.
 * Hovering a stage lights its third on the pitch and surfaces that stage's
 * count plus its conversion into the next stage.
 *
 * Styled to sit quietly next to the Shot map on the BTL dark surface: a subtle
 * glass panel, one plain title, calm motion, no decorative chrome.
 */
export function PhasesOfPlay({ team, color = TEAM_COLOR, phases, className }: PhasesOfPlayProps) {
  const gradId = useId();
  const [activeKey, setActiveKey] = useState<PhaseKey | null>(null);

  // The funnel's mouth — first stage drives both the bar scale and the share of
  // activity each third carries. Guarded so an empty funnel renders flat, not NaN.
  const peak = useMemo(() => phases.reduce((max, p) => Math.max(max, p.sequences), 0), [phases]);

  // Per-third activity = the largest stage that resolves in that third, as a
  // fraction of the peak. Drives how strongly each band shades to the team colour.
  const thirdActivity = useMemo<[number, number, number]>(() => {
    const acc: [number, number, number] = [0, 0, 0];
    for (const p of phases) {
      const t = PHASE_THIRD[p.key];
      acc[t] = Math.max(acc[t], peak > 0 ? p.sequences / peak : 0);
    }
    return acc;
  }, [phases, peak]);

  const activeThird = activeKey === null ? null : PHASE_THIRD[activeKey];

  return (
    <div
      className={cn(
        'my-6 rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4',
        'shadow-[0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-[12px] [border-top-color:rgba(255,255,255,0.10)]',
        className
      )}
    >
      {/* Header: one plain title + the team it describes. */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold tracking-tight text-white">Phases of play</span>
        <span className="flex items-center gap-1.5 text-[11px] text-white/60">
          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate">{team}</span>
        </span>
      </div>

      {/* Thirds-zoned pitch — defensive / middle / attacking bands shade to the
          team colour by activity; the active stage's band brightens. */}
      <div className="relative">
        <Pitch variant="full" theme="dark">
          {([0, 1, 2] as const).map((t) => {
            const x = t * THIRD;
            const activity = thirdActivity[t];
            const isActive = activeThird === t;
            // Faint base shade by activity, lifted when the stage is hovered.
            const opacity = (isActive ? 0.28 : 0.1) + activity * (isActive ? 0.34 : 0.22);
            return (
              <motion.rect
                key={t}
                x={x}
                y={0}
                width={THIRD}
                height={100}
                fill={color}
                initial={false}
                animate={{ opacity }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ pointerEvents: 'none' }}
              />
            );
          })}

          {/* Thin dividers between the thirds, sitting above the shading. */}
          {[THIRD, THIRD * 2].map((x) => (
            <line
              key={x}
              x1={x}
              y1={0}
              x2={x}
              y2={100}
              stroke="white"
              strokeOpacity={0.12}
              strokeWidth={0.3}
              strokeDasharray="1.5 1.5"
              style={{ pointerEvents: 'none' }}
            />
          ))}

          {/* Third labels, low-contrast so they read as annotation. */}
          {[
            { t: 0 as const, label: 'Defensive' },
            { t: 1 as const, label: 'Middle' },
            { t: 2 as const, label: 'Attacking' },
          ].map(({ t, label }) => (
            <text
              key={t}
              x={t * THIRD + THIRD / 2}
              y={95}
              textAnchor="middle"
              fontSize={2.6}
              fill="white"
              fillOpacity={activeThird === t ? 0.8 : 0.4}
              style={{ letterSpacing: '0.06em', pointerEvents: 'none' }}
            >
              {label}
            </text>
          ))}
        </Pitch>
      </div>

      {/* Funnel readout — a stepped bar per stage with the drop-off between
          stages. The whole funnel fills on mount; hover lights the matching third. */}
      <div
        className="mt-4 flex flex-col gap-1.5"
        role="list"
        aria-label={`${team} possession funnel`}
      >
        {phases.map((phase, i) => {
          const prev = i > 0 ? phases[i - 1]?.sequences : undefined;
          const toNext =
            i < phases.length - 1 ? conversion(phase.sequences, phases[i + 1]!.sequences) : null;
          const fromPrev = conversion(prev, phase.sequences);
          const width = peak > 0 ? clamp01(phase.sequences / peak) : 0;
          const isActive = phase.key === activeKey;
          const dimmed = activeKey !== null && !isActive;

          return (
            <div key={phase.key} role="listitem">
              <motion.button
                type="button"
                aria-label={`${phase.label}: ${phase.sequences} sequences${
                  i > 0 ? `, ${pct(fromPrev)} of ${phases[i - 1]?.label}` : ''
                }`}
                onMouseEnter={() => setActiveKey(phase.key)}
                onMouseLeave={() => setActiveKey(null)}
                onFocus={() => setActiveKey(phase.key)}
                onBlur={() => setActiveKey(null)}
                className="group flex w-full items-center gap-3 focus:outline-none"
                initial={false}
                animate={{ opacity: dimmed ? 0.4 : 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {/* Label column. */}
                <span
                  className={cn(
                    'w-24 shrink-0 text-left text-[11px] transition-colors',
                    isActive ? 'text-white' : 'text-white/55 group-hover:text-white/80'
                  )}
                >
                  {phase.label}
                </span>

                {/* Bar track + fill. The fill animates from zero on mount. */}
                <span className="relative h-6 flex-1 overflow-hidden rounded-[5px] bg-white/[0.04]">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-[5px]"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${width * 100}%`,
                      opacity: isActive ? 1 : 0.72,
                      boxShadow: isActive ? `0 0 10px -2px ${color}` : 'none',
                    }}
                    transition={{
                      width: { duration: 0.6, ease: 'easeOut', delay: 0.08 * i },
                      opacity: { duration: 0.2, ease: 'easeOut' },
                    }}
                  />
                </span>

                {/* Count, in tabular figures so the column stays aligned. */}
                <span
                  className={cn(
                    'w-10 shrink-0 text-right text-[13px] font-semibold tabular-nums transition-colors',
                    isActive ? 'text-white' : 'text-white/70'
                  )}
                >
                  {phase.sequences}
                </span>
              </motion.button>

              {/* Drop-off connector to the next stage: how many sequences carry
                  over, and what share is lost. Revealed for the hovered stage. */}
              {toNext !== null && (
                <div className="flex items-center gap-3 pl-24">
                  <div className="flex-1 py-0.5 pl-3">
                    <span
                      className={cn(
                        'text-[10px] tabular-nums transition-colors',
                        phase.key === activeKey ? 'text-white/75' : 'text-white/30'
                      )}
                    >
                      <span style={{ color }}>{pct(toNext)}</span> carried on
                      <span className="text-white/30">
                        {' '}
                        · {phase.sequences - (phases[i + 1]?.sequences ?? 0)} lost
                      </span>
                    </span>
                  </div>
                  <span className="w-10 shrink-0" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hidden gradient def kept stable across renders via useId, in case a
          caller themes the bars with a fill ramp later. */}
      <svg width={0} height={0} aria-hidden className="absolute">
        <defs>
          <linearGradient id={`${gradId}-ramp`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={color} stopOpacity={0.5} />
            <stop offset="1" stopColor={color} stopOpacity={1} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
