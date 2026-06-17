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
  /** Optional team crest URL — a small crest is shown next to the team name. */
  crestUrl?: string;
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

// xT is read as a fraction of this ceiling for every visual ramp (width,
// colour, head size). A single progressive action rarely tops ~0.15, so 0.16
// keeps the hottest real balls near the top of the ramp without clipping.
const XT_CEIL = 0.16;

/** xT as a 0–1 fraction of the visual ceiling. */
function xtFraction(xt: number): number {
  if (!Number.isFinite(xt) || xt <= 0) return 0;
  return Math.min(1, xt / XT_CEIL);
}

/**
 * Perceptual emphasis curve. Pushing the fraction through a gentle ease makes
 * the top of the range (the line-breaking, into-the-box balls) pull visually
 * ahead of the mass of low-threat build-up, which is the whole point.
 */
function emphasis(frac: number): number {
  return Math.pow(frac, 1.35);
}

/**
 * Normalise a StatsBomb point to the 0–100 pitch. The team attacks the
 * right-hand goal, so the attacking frame (x→120) maps straight through.
 */
function toPitch(x: number, y: number): { x: number; y: number } {
  return { x: (x * 100) / SB_X, y: (y * 100) / SB_Y };
}

/** Stroke width in viewBox units. Wide dynamic range so xT reads off thickness. */
function widthForXt(xt: number): number {
  return 0.45 + emphasis(xtFraction(xt)) * 1.85;
}

/** Head pip radius — a magnitude cue at the arrow head, sized by xT. */
function headRadiusForXt(xt: number): number {
  return 0.55 + emphasis(xtFraction(xt)) * 1.35;
}

/**
 * Two-stop hot ramp from a dim base toward an incandescent head, driven by xT.
 * Low threat stays muted and recedes; high threat brightens and warms toward
 * white-hot so the eye lands on it first. `base` is the team accent.
 */
function rampColor(xt: number, base: RGB): string {
  const t = emphasis(xtFraction(xt));
  // Cold end: a dimmed, desaturated version of the accent that sinks back.
  const cold = mix(base, { r: 40, g: 44, b: 52 }, 0.55);
  // Warm midpoint: the accent at full strength.
  // Hot end: the accent lifted toward a bright amber/white so it glows.
  const hot = mix(base, { r: 255, g: 224, b: 130 }, 0.72);
  return rgb(t < 0.5 ? mix(cold, base, t / 0.5) : mix(base, hot, (t - 0.5) / 0.5));
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Parse `#rgb` / `#rrggbb` to RGB. Falls back to the BTL red on a bad value. */
function parseHex(hex: string): RGB {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { r: 235, g: 0, b: 0 };
  const h = m[1]!;
  const full = h.length === 3 ? h.replace(/(.)/g, '$1$1') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Linear blend of two colours; `t` 0→a, 1→b. */
function mix(a: RGB, b: RGB, t: number): RGB {
  const k = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * k),
    g: Math.round(a.g + (b.g - a.g) * k),
    b: Math.round(a.b + (b.b - a.b) * k),
  };
}

function rgb({ r, g, b }: RGB): string {
  return `rgb(${r}, ${g}, ${b})`;
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
 * A gently-curved arrow path between two pitch points. A small perpendicular
 * bow lifts overlapping actions off each other so a dozen arrows through the
 * same channel stay separable instead of merging into one dark smear.
 */
function arcPath(start: { x: number; y: number }, end: { x: number; y: number }): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular unit vector; bow scales with length but is capped.
  const bow = Math.min(2.6, len * 0.16);
  const nx = -dy / len;
  const ny = dx / len;
  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;
  const cx = mx + nx * bow;
  const cy = my + ny * bow;
  return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
}

/**
 * Progression — an interactive plot of a team's ball progression on the BTL
 * dark surface, styled to sit quietly next to the Shot map. Each progressive
 * carry or pass is a gently-curved arrow from start to end; its width, colour
 * and head pip all scale with the expected-threat (xT) it added, so the hottest
 * balls — the ones breaking lines and into the box — jump out while build-up
 * recedes. Carries are dashed and passes solid; arrows draw in on a short
 * stagger when the block mounts. Hovering or focusing an arrow highlights it
 * (others dim) and surfaces a callout with the player and xT added. A bare
 * total-xT readout sits alongside a dropdown that filters to carries, passes,
 * or a single player.
 */
export function Progression({
  team,
  crestUrl,
  color = DEFAULT_COLOR,
  actions,
  className,
}: ProgressionProps) {
  const idPrefix = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProgressionFilter>({ kind: 'all' });

  const baseRgb = useMemo(() => parseHex(color), [color]);

  const matches = (a: ProgressionAction): boolean => {
    if (filter.kind === 'all') return true;
    if (filter.kind === 'type') return a.type === filter.type;
    return a.player === filter.player;
  };

  const shown = useMemo(() => actions.filter(matches), [actions, filter]);

  // Draw the brightest (highest-xT) arrows last so they sit on top of the mass.
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
          {ordered.map((action, i) => {
            const start = toPitch(action.startX, action.startY);
            const end = toPitch(action.endX, action.endY);
            const { d, ctrl } = arcPath(start, end);
            const isActive = action.id === activeId;
            const dimmed = activeId !== null && !isActive;
            const w = widthForXt(action.xt);
            const stroke = isActive ? rampColor(XT_CEIL, baseRgb) : rampColor(action.xt, baseRgb);
            const headR = headRadiusForXt(action.xt);
            const isCarry = action.type === 'carry';
            const hot = emphasis(xtFraction(action.xt));
            const markerId = `${idPrefix}-h-${action.id}`;

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
                animate={{ opacity: dimmed ? 0.14 : 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {/* Per-arrow arrowhead, tinted to this action's ramp colour so the
                    head itself signals threat. */}
                <defs>
                  <marker
                    id={markerId}
                    viewBox="0 0 10 10"
                    refX="6.5"
                    refY="5"
                    markerWidth={3.2 + hot * 2.2}
                    markerHeight={3.2 + hot * 2.2}
                    orient="auto-start-reverse"
                  >
                    <path d="M0 0.8 L9 5 L0 9.2 L2.4 5 z" fill={stroke} />
                  </marker>
                </defs>

                {/* Wide invisible hit-path so thin arrows stay easy to hover. */}
                <path d={d} fill="none" stroke="transparent" strokeWidth={3.5} />

                {/* The arrow. Curved; carries dashed, passes solid; both draw in
                    on a stagger via an animated path length. High-xT arrows glow. */}
                <motion.path
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={isActive ? w + 0.5 : w}
                  strokeLinecap="round"
                  strokeDasharray={isCarry ? '1.7 1.5' : undefined}
                  markerEnd={`url(#${markerId})`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    pathLength: { duration: 0.5, ease: 'easeOut', delay: 0.05 + i * 0.035 },
                    opacity: { duration: 0.2, delay: 0.05 + i * 0.035 },
                  }}
                  style={{
                    filter: isActive
                      ? `drop-shadow(0 0 2px ${stroke})`
                      : hot > 0.55
                        ? `drop-shadow(0 0 ${0.6 + hot * 1.1}px ${stroke})`
                        : undefined,
                  }}
                />

                {/* Head pip — a magnitude cue at the arrow head, on the curve. */}
                <motion.circle
                  cx={end.x}
                  cy={end.y}
                  r={isActive ? headR + 0.3 : headR}
                  fill={stroke}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, delay: 0.2 + i * 0.035, ease: 'backOut' }}
                  style={{
                    transformOrigin: `${end.x}px ${end.y}px`,
                    filter: hot > 0.55 ? `drop-shadow(0 0 ${0.5 + hot}px ${stroke})` : undefined,
                  }}
                />

                {/* Faint origin tick — anchors where the action began. */}
                <circle cx={start.x} cy={start.y} r={0.7} fill={stroke} fillOpacity={0.5} />

                {/* Control point is unused visually but keeps `ctrl` referenced
                    for callout anchoring of the active action below. */}
                {isActive && <circle cx={ctrl.x} cy={ctrl.y} r={0} fill="none" />}
              </motion.g>
            );
          })}

          {/* Callout for the active action, drawn last so it sits on top. */}
          {active && <Callout action={active} color={rampColor(XT_CEIL, baseRgb)} />}
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

      {/* Readout row: bare total xT + crest/team, with the threat ramp + type key. */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold tabular-nums leading-none text-white">
            {totalXt.toFixed(2)}
          </span>
          <span className="text-white/45">xT</span>
          <span className="mx-0.5 text-white/15">·</span>
          {crestUrl && (
            <img
              src={crestUrl}
              alt=""
              aria-hidden
              width={16}
              height={16}
              className="size-4 shrink-0 object-contain"
            />
          )}
          <span className="truncate text-white/55">{team}</span>
        </div>
        <div className="flex items-center gap-3 text-white/55">
          <ThreatRamp baseRgb={baseRgb} />
          <span className="text-white/15">·</span>
          <TypeKey color={rampColor(XT_CEIL * 0.7, baseRgb)} type="pass" />
          <TypeKey color={rampColor(XT_CEIL * 0.7, baseRgb)} type="carry" />
        </div>
      </div>
    </div>
  );
}

/** Low→high xT colour-ramp legend — reads the hot/cold encoding at a glance. */
function ThreatRamp({ baseRgb }: { baseRgb: RGB }) {
  const stops = [0.06, 0.28, 0.5, 0.72, 1].map((t) => rampColor(t * XT_CEIL, baseRgb));
  return (
    <span className="flex items-center gap-1.5" aria-hidden>
      <span className="text-white/40">low</span>
      <span className="flex h-1.5 w-14 overflow-hidden rounded-full">
        {stops.map((c, i) => (
          <span key={i} className="h-full flex-1" style={{ backgroundColor: c }} />
        ))}
      </span>
      <span className="text-white/70">high xT</span>
    </span>
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
