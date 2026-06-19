import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import { surname } from '#/football/lib/player-name';
import { PanelFooter } from '#/football/lib/panel-footer';
import { SvgHeadshot } from '#/football/lib/headshot';
import { finite } from '#/football/lib/finite';

/** How a single touch in the move connects to the next. */
export type GoalStepType = 'pass' | 'carry' | 'shot';

/** One touch in a goal-scoring move, in StatsBomb 120×80 coordinates. */
export interface GoalStep {
  /** StatsBomb x (0–120), own goal line → attacked goal. */
  x: number;
  /** StatsBomb y (0–80), left touchline → right. */
  y: number;
  /** Player on the ball for this touch. */
  player: string;
  /**
   * How this touch leaves the player: a `pass` (solid line) or `carry`
   * (dashed line) to the next touch, or the `shot` that finishes the move.
   */
  type: GoalStepType;
  /** Headshot URL for the player. Used for the finishing `shot` marker (monogram fallback). */
  imageUrl?: string;
}

/** A single goal-scoring possession. */
export interface Goal {
  /** Stable identifier. */
  id: string;
  /** Short label for the goal (used in the picker). */
  label: string;
  /** Scorer display name (the player on the finishing touch). */
  scorer: string;
  /** Match minute. */
  minute: number;
  /** Touches in order, from where the move began to the finish. */
  steps: GoalStep[];
}

export interface GoalSequenceProps {
  /** Team that scored — shown in the title. */
  team: string;
  /** Optional team crest URL, shown ~16px next to the team name. */
  crestUrl?: string;
  /** One or more goals to trace; the first is shown by default. */
  goals: Goal[];
  /** Move accent. Defaults to BTL home red. */
  color?: string;
  /** Additional CSS classes on the outer panel. */
  className?: string;
  /**
   * BTL wordmark for the footer colophon. A design-system-aware host (the
   * editor) passes the real `BtlWordmark`; omitted in Storybook/standalone,
   * where the footer falls back to viz's inlined replica.
   */
  wordmark?: ReactNode;
}

const ACCENT = '#eb0000';

// StatsBomb pitch is 120 (x) × 80 (y); the Pitch primitive is 100 × 100.
const SB_X = 120;
const SB_Y = 80;

/** The goal mouth the move attacks, in pitch coords (always the right goal). */
const GOAL = { x: 100, y: 50 };

/** Normalise a StatsBomb point to the 0–100 pitch (team attacks left→right). */
function toPitch(x: number, y: number): { x: number; y: number } {
  return { x: finite((x * 100) / SB_X), y: finite((y * 100) / SB_Y) };
}

// Per-segment timing for the step-by-step reveal.
const SEG_DURATION = 0.55; // seconds for one action's line + ball travel
const SEG_GAP = 0.12; // pause between actions

/**
 * The move — traces a single goal-scoring possession on the BTL dark pitch:
 * the connected passes and carries in order, drawn one after another with the
 * ball travelling along the chain, ending in the finish (a red bloom + the
 * scorer's headshot). The most cinematic of the viz blocks — "how the goal was
 * built". A Replay control re-runs the animation; with more than one goal, a
 * clean dropdown picks between them.
 */
export function GoalSequence({
  team,
  crestUrl,
  goals,
  color = ACCENT,
  className,
  wordmark,
}: GoalSequenceProps) {
  // Bumping `runId` remounts the animated layer, so it replays from the start
  // declaratively (no effects, no imperative animation controls).
  const [runId, setRunId] = useState(0);
  const [goalId, setGoalId] = useState<string | null>(null);

  const goal = useMemo(() => goals.find((g) => g.id === goalId) ?? goals[0], [goals, goalId]);

  // Resolve each step to pitch coords once; the shot ends at the goal mouth.
  const points = useMemo(() => (goal ? goal.steps.map((s) => toPitch(s.x, s.y)) : []), [goal]);

  if (!goal || goal.steps.length === 0) return null;

  const steps = goal.steps;
  const finishIndex = steps.length - 1;
  const goalOptions = goals.map((g) => ({
    value: g.id,
    label: `${g.label} · ${g.minute}'`,
  }));
  const selectedLabel = `${goal.label} · ${goal.minute}'`;

  const selectGoal = (id: string) => {
    setGoalId(id);
    setRunId((r) => r + 1); // fresh goal plays from the top
  };

  return (
    <div
      className={cn(
        'my-6 rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4',
        'shadow-[0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-[12px] [border-top-color:rgba(255,255,255,0.10)]',
        className
      )}
    >
      {/* Header: team (+ crest) title, optional goal picker, Replay. */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold tracking-tight text-white">
          {crestUrl && (
            <img
              src={crestUrl}
              alt=""
              width={16}
              height={16}
              className="size-4 shrink-0 object-contain"
            />
          )}
          {team}
        </span>

        <div className="flex items-center gap-2">
          {goalOptions.length > 1 && (
            <ControlDropdown label="Goal" valueLabel={selectedLabel}>
              {(close) =>
                goalOptions.map((o) => (
                  <DropdownItem
                    key={o.value}
                    selected={o.value === goal.id}
                    onSelect={() => {
                      selectGoal(o.value);
                      close();
                    }}
                  >
                    {o.label}
                  </DropdownItem>
                ))
              }
            </ControlDropdown>
          )}
          <button
            type="button"
            onClick={() => setRunId((r) => r + 1)}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-white/10 bg-white/[0.04]',
              'px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:border-white/25'
            )}
          >
            <ReplayGlyph />
            Replay
          </button>
        </div>
      </div>

      {/* Pitch + the animated move. Keyed by runId so each run replays cleanly. */}
      <div className="relative">
        <Pitch variant="full" theme="dark">
          <MoveLayer
            key={runId}
            steps={steps}
            points={points}
            finishIndex={finishIndex}
            color={color}
          />
        </Pitch>
      </div>

      {/* Scorer + minute — data label only, no prose. */}
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-white/90">
        <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-semibold text-white/80">{goal.scorer}</span>
        <span className="tabular-nums">{goal.minute}&apos;</span>
      </div>

      <PanelFooter provider="statsbomb" wordmark={wordmark} />
    </div>
  );
}

/**
 * The animated chain. Each segment (touch → next touch) reveals after the
 * previous one: the connecting line draws in, a ball dot travels along it, and
 * the touch marker pops. The finish gets a red bloom + the scorer's headshot.
 */
function MoveLayer({
  steps,
  points,
  finishIndex,
  color,
}: {
  steps: GoalStep[];
  points: { x: number; y: number }[];
  finishIndex: number;
  color: string;
}) {
  // The path ends at the goal mouth for the shot; otherwise at the next touch.
  const targetFor = (i: number): { x: number; y: number } => {
    if (steps[i]?.type === 'shot') return GOAL;
    return points[i + 1] ?? points[i] ?? GOAL;
  };

  const segDelay = (i: number) => i * (SEG_DURATION + SEG_GAP);
  const totalSteps = steps.length;

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Connecting segments, drawn in order. */}
      {steps.map((step, i) => {
        const from = points[i];
        if (!from) return null;
        const to = targetFor(i);
        const isShot = step.type === 'shot';
        const delay = segDelay(i);

        return (
          <g key={`seg-${i}`}>
            {/* The line: solid for a pass / shot, dashed for a carry. */}
            <motion.line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={color}
              strokeWidth={isShot ? 0.7 : 0.5}
              strokeOpacity={isShot ? 0.95 : 0.7}
              strokeLinecap="round"
              strokeDasharray={step.type === 'carry' ? '1.4 1.2' : undefined}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { delay, duration: SEG_DURATION, ease: 'easeInOut' },
                opacity: { delay, duration: 0.12 },
              }}
            />

            {/* The ball, travelling from this touch to the next. */}
            <motion.circle
              r={isShot ? 0.95 : 0.8}
              fill="white"
              initial={{ cx: from.x, cy: from.y, opacity: 0 }}
              animate={{ cx: to.x, cy: to.y, opacity: [0, 1, 1, isShot ? 1 : 0] }}
              transition={{
                cx: { delay, duration: SEG_DURATION, ease: 'easeInOut' },
                cy: { delay, duration: SEG_DURATION, ease: 'easeInOut' },
                opacity: { delay, duration: SEG_DURATION, times: [0, 0.12, 0.85, 1] },
              }}
            />
          </g>
        );
      })}

      {/* Goal bloom — swells in as the shot arrives. */}
      <motion.circle
        cx={GOAL.x}
        cy={GOAL.y}
        r={3.4}
        fill={color}
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: [0, 0.42, 0.26], scale: [0.3, 1.25, 1] }}
        transition={{
          delay: segDelay(finishIndex) + SEG_DURATION * 0.6,
          duration: 0.5,
          ease: 'easeOut',
        }}
        style={{ transformOrigin: `${GOAL.x}px ${GOAL.y}px`, filter: 'blur(1.1px)' }}
      />

      {/* Touch markers + labels, popping as each touch is reached. */}
      {steps.map((step, i) => {
        const p = points[i];
        if (!p) return null;
        const isFinish = i === finishIndex;
        const delay = segDelay(i);
        const r = isFinish ? 2.2 : 1.4;
        // Keep labels inside the pitch near the right edge / top.
        const labelAbove = p.y > 16;
        const labelY = labelAbove ? p.y - r - 1.3 : p.y + r + 2.6;

        return (
          <motion.g
            key={`touch-${i}`}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.32, ease: 'backOut' }}
            style={{ transformOrigin: `${p.x}px ${p.y}px` }}
          >
            {isFinish ? (
              // The finish: the scorer's headshot, or a filled accent marker
              // carrying initials when there's no photo or it fails to load.
              <SvgHeadshot
                cx={p.x}
                cy={p.y}
                r={r}
                name={step.player}
                imageUrl={step.imageUrl}
                color={color}
                ringColor={color}
                ringWidth={0.7}
                monogramFill="#0a0a0a"
                monogramSizeRatio={0.95}
                fallbackStroke="white"
                fallbackStrokeWidth={0.3}
              />
            ) : (
              // A build-up touch: small numbered node.
              <>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={color}
                  fillOpacity={0.2}
                  stroke={color}
                  strokeWidth={0.45}
                  strokeOpacity={0.95}
                />
                <text
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={1.6}
                  fontWeight="bold"
                  fill="white"
                  fillOpacity={0.85}
                >
                  {i + 1}
                </text>
              </>
            )}

            {/* Surname along the chain. The finish reads brighter. */}
            <text
              x={p.x}
              y={labelY}
              textAnchor="middle"
              fontSize={isFinish ? 2.6 : 2.1}
              fontWeight={isFinish ? 'bold' : '600'}
              fill="white"
              fillOpacity={isFinish ? 0.95 : 0.7}
            >
              {surname(step.player)}
            </text>
          </motion.g>
        );
      })}

      {/* Tiny progress hint: a clock-free row of dots tracking the chain. */}
      <g aria-hidden style={{ pointerEvents: 'none' }}>
        {steps.map((_, i) => (
          <motion.circle
            key={`tick-${i}`}
            cx={4 + i * 2.4}
            cy={4}
            r={0.7}
            fill="white"
            initial={{ opacity: 0.18 }}
            animate={{ opacity: [0.18, 1, 0.5] }}
            transition={{
              delay: segDelay(i),
              duration: SEG_DURATION,
              times: [0, 0.3, 1],
            }}
          />
        ))}
        {/* Track length cue so the dots read as a sequence of `totalSteps`. */}
        <line
          x1={4}
          y1={4}
          x2={4 + Math.max(0, totalSteps - 1) * 2.4}
          y2={4}
          stroke="white"
          strokeOpacity={0.1}
          strokeWidth={0.3}
        />
      </g>
    </g>
  );
}

// ── Share-menu-style dropdown ────────────────────────────────────────────────
// Mirrors the shot-map block's self-contained ControlDropdown (viz is a
// standalone AGPL package with no design-system dependency; the classes match
// the editor's game-block kit).
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

/** Tiny replay glyph — a circular arrow (no icon dependency). */
function ReplayGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" className="text-white/70">
      <path
        d="M13 8a5 5 0 1 1-1.46-3.54"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M13 2.5V5.5H10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
