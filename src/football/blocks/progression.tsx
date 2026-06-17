import { useId, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';

/** A progressive action: a carry or a pass that advances the ball. */
export type ProgressionType = 'carry' | 'pass';

/**
 * A single progressive action, in StatsBomb 120×80 pitch coordinates.
 *
 * Coordinates are in the team's own attacking frame: x→120 is the goal it
 * attacks. The block maps the team to attack the right-hand goal, so an action
 * ending near x=120 lands in the right-hand box.
 */
export interface ProgressionAction {
  /** Stable identifier. */
  id: string;
  /** Carry (ball at feet) or pass (ball played to a team-mate). */
  type: ProgressionType;
  /** Start x (0–120, own goal line → opposition goal line). */
  startX: number;
  /** Start y (0–80, left touchline → right). */
  startY: number;
  /** End x (0–120). */
  endX: number;
  /** End y (0–80). */
  endY: number;
  /** Expected-threat added by the action (typically ~0.01–0.15). */
  xt: number;
  /** Player who made the action. */
  player: string;
}

/** Which actions are shown: everything, by type, or a single player. */
export type ProgressionFilter =
  | { kind: 'all' }
  | { kind: 'type'; type: ProgressionType }
  | { kind: 'player'; player: string };

export interface ProgressionProps {
  /** Team display name. */
  team: string;
  /** Accent colour. Defaults to BTL red. */
  color?: string;
  /** Progressive actions to plot. */
  actions: ProgressionAction[];
  /** Additional CSS classes on the outer panel. */
  className?: string;
}

const DEFAULT_COLOR = '#eb0000';

// StatsBomb pitch is 120 (x) × 80 (y); the Pitch primitive is 100 × 100.
const SB_X = 120;
const SB_Y = 80;

/**
 * Normalise a StatsBomb point to the 0–100 pitch. The team attacks the
 * right-hand goal, so the attacking frame (x→120) maps straight through.
 */
function toPitch(x: number, y: number): { x: number; y: number } {
  return { x: (x * 100) / SB_X, y: (y * 100) / SB_Y };
}

/** Stroke width in viewBox units, scaled by xT (small actions stay visible). */
function widthForXt(xt: number): number {
  const clamped = Math.max(0, Math.min(0.2, xt));
  return 0.35 + (clamped / 0.2) * 1.15;
}

/** Line opacity scaled by xT, so higher-threat actions read brighter. */
function opacityForXt(xt: number): number {
  const clamped = Math.max(0, Math.min(0.2, xt));
  return 0.34 + (clamped / 0.2) * 0.56;
}

const TYPE_LABEL: Record<ProgressionType, string> = {
  carry: 'Carry',
  pass: 'Pass',
};

/** True when two filters are the same selection. */
function filterEq(a: ProgressionFilter, b: ProgressionFilter): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'type' && b.kind === 'type') return a.type === b.type;
  if (a.kind === 'player' && b.kind === 'player') return a.player === b.player;
  return true;
}

/**
 * Progression — an interactive plot of a team's ball progression on the BTL
 * dark surface, styled to sit quietly next to the Shot map. Each progressive
 * carry or pass is an arrow from start to end; arrow width and brightness scale
 * with the expected-threat (xT) it added, carries are dashed and passes solid,
 * and the arrows draw in on a short stagger when the block mounts. Hovering or
 * focusing an arrow highlights it (others dim) and surfaces a callout with the
 * player and xT added. A clean total-xT readout sits alongside a dropdown that
 * filters to carries, passes, or a single player.
 */
export function Progression({ team, color = DEFAULT_COLOR, actions, className }: ProgressionProps) {
  const markerPrefix = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProgressionFilter>({ kind: 'all' });

  const matches = (a: ProgressionAction): boolean => {
    if (filter.kind === 'all') return true;
    if (filter.kind === 'type') return a.type === filter.type;
    return a.player === filter.player;
  };

  const shown = useMemo(() => actions.filter(matches), [actions, filter]);

  // Draw the brightest (highest-xT) arrows last so they sit on top.
  const ordered = useMemo(() => [...shown].sort((a, b) => a.xt - b.xt), [shown]);

  const active = useMemo(() => shown.find((a) => a.id === activeId) ?? null, [shown, activeId]);

  const totalXt = useMemo(() => shown.reduce((sum, a) => sum + a.xt, 0), [shown]);

  // Players in xT-contribution order for the filter menu.
  const players = useMemo(() => {
    const byPlayer = new Map<string, number>();
    for (const a of actions) byPlayer.set(a.player, (byPlayer.get(a.player) ?? 0) + a.xt);
    return [...byPlayer.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [actions]);

  const filterOptions: { value: ProgressionFilter; label: string }[] = [
    { value: { kind: 'all' }, label: 'All actions' },
    { value: { kind: 'type', type: 'carry' }, label: 'Carries' },
    { value: { kind: 'type', type: 'pass' }, label: 'Passes' },
    ...players.map((p) => ({ value: { kind: 'player' as const, player: p }, label: p })),
  ];
  const filterValueLabel =
    filterOptions.find((o) => filterEq(o.value, filter))?.label ?? 'All actions';

  return (
    <div
      className={cn(
        'my-6 rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4',
        'shadow-[0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-[12px] [border-top-color:rgba(255,255,255,0.10)]',
        className
      )}
    >
      {/* Header: one plain title + clean filter dropdown. */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold tracking-tight text-white">Progression</span>
        <ControlDropdown label="Showing" valueLabel={filterValueLabel}>
          {(close) =>
            filterOptions.map((o) => (
              <DropdownItem
                key={o.label}
                selected={filterEq(o.value, filter)}
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

      {/* Pitch + progressive actions */}
      <div className="relative">
        <Pitch variant="full" theme="dark">
          <defs>
            {/* Arrowhead, tinted to the accent; one per render via stable id. */}
            <marker
              id={`${markerPrefix}-head`}
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0 1 L9 5 L0 9 z" fill={color} />
            </marker>
          </defs>

          {ordered.map((action, i) => {
            const start = toPitch(action.startX, action.startY);
            const end = toPitch(action.endX, action.endY);
            const isActive = action.id === activeId;
            const dimmed = activeId !== null && !isActive;
            const baseOpacity = opacityForXt(action.xt);
            const w = widthForXt(action.xt);
            const isCarry = action.type === 'carry';

            return (
              <motion.g
                key={action.id}
                role="button"
                tabIndex={0}
                aria-label={`${action.player}, ${TYPE_LABEL[action.type]}, xT ${action.xt.toFixed(
                  3
                )}`}
                className="cursor-pointer focus:outline-none"
                onMouseEnter={() => setActiveId(action.id)}
                onMouseLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(action.id)}
                onBlur={() => setActiveId(null)}
                onClick={() => setActiveId((cur) => (cur === action.id ? null : action.id))}
                initial={false}
                animate={{ opacity: dimmed ? 0.16 : 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {/* Wide invisible hit-line so thin arrows stay easy to hover. */}
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="transparent"
                  strokeWidth={3}
                />

                {/* The arrow. Carries dashed, passes solid; both draw in on a
                    stagger via an animated path length. */}
                <motion.line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={color}
                  strokeWidth={isActive ? w + 0.35 : w}
                  strokeOpacity={isActive ? 1 : baseOpacity}
                  strokeLinecap="round"
                  strokeDasharray={isCarry ? '1.6 1.4' : undefined}
                  markerEnd={`url(#${markerPrefix}-head)`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    pathLength: { duration: 0.5, ease: 'easeOut', delay: 0.05 + i * 0.04 },
                    opacity: { duration: 0.2, delay: 0.05 + i * 0.04 },
                  }}
                  style={{ filter: isActive ? `drop-shadow(0 0 1.5px ${color})` : undefined }}
                />

                {/* Start dot — anchors the action's origin. */}
                <circle
                  cx={start.x}
                  cy={start.y}
                  r={isActive ? 1.1 : 0.8}
                  fill={color}
                  fillOpacity={isActive ? 1 : baseOpacity}
                />
              </motion.g>
            );
          })}

          {/* Callout for the active action, drawn last so it sits on top. */}
          {active && <Callout action={active} color={color} />}
        </Pitch>

        {/* Direction-of-play hint — quiet, lower-left. */}
        <div className="pointer-events-none absolute bottom-1.5 left-2 flex items-center gap-1 text-[9px] text-white/35">
          <span>Attacking</span>
          <svg width="14" height="6" viewBox="0 0 14 6" fill="none">
            <path
              d="M0 3 H11 M8 1 L12 3 L8 5"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Readout row: total xT + a small type key. */}
      <div className="mt-3 flex items-center justify-between gap-4 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="text-white/50">Total xT added</span>
          <span className="font-semibold tabular-nums text-white">{totalXt.toFixed(2)}</span>
          <span className="text-white/35">· {team}</span>
        </div>
        <div className="flex items-center gap-3 text-white/60">
          <TypeKey color={color} type="pass" />
          <TypeKey color={color} type="carry" />
        </div>
      </div>
    </div>
  );
}

/** Small data key: a line sample (solid pass / dashed carry) + the label. */
function TypeKey({ color, type }: { color: string; type: ProgressionType }) {
  const isCarry = type === 'carry';
  return (
    <span className="flex items-center gap-1.5">
      <svg width="18" height="6" viewBox="0 0 18 6" fill="none" aria-hidden>
        <line
          x1="1"
          y1="3"
          x2="17"
          y2="3"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray={isCarry ? '3 2.4' : undefined}
        />
      </svg>
      <span>{isCarry ? 'Carry' : 'Pass'}</span>
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
  'absolute right-0 top-[calc(100%+6px)] z-50 flex max-h-[280px] min-w-[160px] flex-col gap-0.5 overflow-y-auto rounded-[8px] border border-white/10 bg-[#161616]/95 p-1 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl';

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

/** Floating callout for the active action: player + type · xT. */
function Callout({ action, color }: { action: ProgressionAction; color: string }) {
  // Anchor near the action's end (where the eye lands after the arrow).
  const p = toPitch(action.endX, action.endY);
  // Keep the card inside the pitch: flip side near the right/top edges.
  const flipX = p.x > 62;
  const flipY = p.y < 24;
  const w = 36;
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
        {action.player}
      </text>
      <text
        x={boxX + 2.4}
        y={boxY + 7.6}
        fontSize={2.2}
        fill="white"
        fillOpacity={0.55}
        style={{ letterSpacing: '0.04em' }}
      >
        {TYPE_LABEL[action.type]} · xT {action.xt.toFixed(3)}
      </text>
    </motion.g>
  );
}
