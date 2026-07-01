import { useId, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import { PanelFooter } from '#/football/lib/panel-footer';
import { Crest } from '#/football/lib/crest';
import { BLOCK_FONT_STACK } from '#/football/lib/font';
import { finite } from '#/football/lib/finite';
import { ControlDropdown, DropdownItem } from '#/football/lib/control-dropdown';
import {
  activeCrest,
  PlayerSelect,
  resolveActiveTeam,
  type SelectablePlayer,
} from '#/football/lib/player-select';
import { usePersistedSelection } from '#/football/lib/use-persisted-selection';
import { RevealOnScroll } from '#/football/lib/reveal-on-scroll';

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
  /**
   * Stable player id, used by the player selector to filter to one player. Omit
   * and the selector falls back to matching on {@link ProgressionAction.player}
   * (the display name).
   */
  playerId?: string;
  /**
   * Player's team display name (the selector's group heading). Supply both
   * sides' actions — each tagged with its team — to split the player list by
   * team and scope the whole-team default to this panel's own `team`. Omit and
   * the default shows every action (the original single-team behaviour).
   */
  team?: string;
}

/** Which actions are shown by TYPE: everything, carries only, or passes only. */
export type ProgressionFilter = { kind: 'all' } | { kind: 'type'; type: ProgressionType };

/**
 * The Progression block's full user-selectable state:
 *   • `filter` — the type filter (all actions / carries / passes);
 *   • `activePlayer` — the drilled-in player (id or display name), or `null` for
 *     the whole-team view;
 *   • `selectedTeam` — the side whose whole-team view is active in team-aware
 *     mode, or `null` for the home side.
 * Seed it via {@link ProgressionProps.initialSelection} and observe changes via
 * {@link ProgressionProps.onSelectionChange}.
 */
export interface ProgressionSelection {
  /** Action-type filter. */
  filter: ProgressionFilter;
  /** Drilled-in player key, or `null` for the whole-team view. */
  activePlayer: string | null;
  /** Active whole-team side (team-aware mode), or `null` for the home side. */
  selectedTeam: string | null;
}

export interface ProgressionProps {
  /** Team display name. */
  team: string;
  /** Optional home team crest URL — a small crest is shown next to the team name. */
  crestUrl?: string;
  /**
   * Away team crest URL. When the data is team-split (both sides' actions are
   * supplied), switching the panel to the OTHER side — "{Away} — whole team" or
   * any away player — badges the read-out with this crest. Omit it (legacy /
   * home-only data) and the away view shows the name alone, never the home badge.
   */
  awayCrestUrl?: string;
  /** Accent colour. Defaults to BTL red. */
  color?: string;
  /** Progressive actions to plot. */
  actions: ProgressionAction[];
  /** Additional CSS classes on the outer panel. */
  className?: string;
  /**
   * BTL wordmark for the footer colophon. A design-system-aware host (the
   * editor) passes the real `BtlWordmark`; omitted in Storybook/standalone,
   * where the footer falls back to viz's inlined replica.
   */
  wordmark?: ReactNode;
  /**
   * Optional builder-only controls (e.g. the editor's match picker) rendered in
   * the footer colophon row, to the LEFT of the wordmark. Purely additive: the
   * reader path passes nothing and the footer is unchanged. Forwarded straight
   * to {@link PanelFooter}.
   */
  builderControls?: ReactNode;
  /**
   * Seeds the block's selection state on mount (e.g. the author's saved choice).
   * When omitted, the block opens on the default (all actions, whole team) —
   * exactly as before. Read once on mount; later changes don't re-seed.
   */
  initialSelection?: ProgressionSelection;
  /**
   * Fires whenever the user changes the selection (type filter, player or side),
   * with the full new selection object. When omitted, no-op (today's behaviour).
   */
  onSelectionChange?: (selection: ProgressionSelection) => void;
}

const DEFAULT_COLOR = '#eb0000';

// StatsBomb pitch is 120 (x) × 80 (y); the Pitch primitive is 100 × 100.
const SB_X = 120;
const SB_Y = 80;

// Absolute ceiling for the MAGNITUDE ramps (stroke width, head-pip size, glow).
// A single progressive action rarely tops ~0.15, so 0.16 keeps the hottest real
// balls near the top of those size cues without clipping. NOTE: the COLOUR ramp
// no longer reads off this ceiling — see {@link xtColorScale}.
const XT_CEIL = 0.16;

/** xT as a 0–1 fraction of the visual ceiling — drives the SIZE cues only. */
function xtFraction(xt: number): number {
  if (!Number.isFinite(xt) || xt <= 0) return 0;
  return Math.min(1, xt / XT_CEIL);
}

/**
 * Smallest xT span the colour scale will stretch across the whole ramp. When the
 * shown actions barely vary (a single ball, or a tight cluster), normalising
 * against a near-zero range would either divide by ~0 or paint random noise as a
 * full rainbow. Flooring the span keeps a genuinely-flat set appropriately muted
 * while still letting any real spread open up. ~0.012 ≈ a meaningful xT step.
 */
const XT_COLOR_SPAN_FLOOR = 0.012;

/** Linear-interpolated quantile of an already-ascending array. */
function quantileSorted(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const pos = (sorted.length - 1) * Math.max(0, Math.min(1, q));
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

/**
 * A DATA-RELATIVE xT→fraction scale for the colour ramp, built from the actions
 * actually on screen (the team / player / type-filtered set). Real progressive
 * xT is individually tiny and clustered low (mostly < 0.05), so reading colour
 * off a fixed 0→0.16 domain crushed almost every arrow into the dim-red bottom
 * and the whole mesh read as one flat colour. Normalising against THIS set's own
 * range restores the gradient: the lowest-xT actions sit at the dim end and the
 * highest at the bright-amber end, whatever the absolute magnitudes are.
 *
 * Robustness:
 * - The range is the ~5th→~95th percentile, not raw min→max, so one freak
 *   outlier can't compress everyone else into a sliver.
 * - The span is floored ({@link XT_COLOR_SPAN_FLOOR}) so a single action or a
 *   tight cluster stays muted instead of dividing by ~0 or rainbow-ing noise.
 * - A gentle `sqrt` curve lifts the mid-range so the mass of build-up actions
 *   spreads visibly rather than bunching near the floor.
 *
 * Returns a pure `xt → 0..1` function; rebuild it (memoised on the shown set) so
 * the scale re-fits whenever the filter or player selection changes.
 */
function xtColorScale(xts: number[]): (xt: number) => number {
  const vals = xts.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (vals.length === 0) return () => 0;
  const lo = quantileSorted(vals, 0.05);
  const hi = quantileSorted(vals, 0.95);
  const span = Math.max(hi - lo, XT_COLOR_SPAN_FLOOR);
  return (xt: number): number => {
    if (!Number.isFinite(xt) || xt <= 0) return 0;
    const frac = (xt - lo) / span;
    return Math.sqrt(Math.max(0, Math.min(1, frac)));
  };
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
  return { x: finite((x * 100) / SB_X), y: finite((y * 100) / SB_Y) };
}

/** Stroke width in viewBox units. Wide dynamic range so xT reads off thickness.
 * Floor + range both lifted so even low-xT build-up has body (a visible mesh,
 * not hairlines) while the top of the range still clearly out-weighs it. */
function widthForXt(xt: number): number {
  return 0.7 + emphasis(xtFraction(xt)) * 2.0;
}

/** Head pip radius — a magnitude cue at the arrow head, sized by xT. */
function headRadiusForXt(xt: number): number {
  return 0.55 + emphasis(xtFraction(xt)) * 1.35;
}

/**
 * Two-stop hot ramp from a live base toward an incandescent head. Low threat is
 * muted but still clearly coloured (not a near-grey ghost); high threat brightens
 * and warms toward white-hot so the eye lands on it first. `base` is the team
 * accent.
 *
 * `frac` is a 0–1 position along the ramp. It is DATA-RELATIVE — produced by
 * {@link xtColorScale} from the shown actions' own range — not a fixed fraction
 * of an absolute xT ceiling. That is the fix for the "whole mesh is one flat red"
 * bug: against the old fixed 0→0.16 domain, real (clustered-low) xT never climbed
 * out of the cold end. The hue endpoints below are unchanged; only what drives
 * the position along them changed.
 *
 * The cold end keeps far more of the accent (a gentle dim only) so build-up reads
 * as a vivid web; the hot end lifts toward bright amber/white so the high-xT
 * balls pull decisively ahead.
 */
function rampColor(frac: number, base: RGB): string {
  const t = Math.max(0, Math.min(1, frac));
  // Cold end: the accent only lightly dimmed — saturated, not slate-grey.
  const cold = mix(base, { r: 92, g: 70, b: 78 }, 0.32);
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

/** True when two type-filters are the same selection. */
function filterEq(a: ProgressionFilter, b: ProgressionFilter): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'type' && b.kind === 'type') return a.type === b.type;
  return true;
}

/**
 * A gently-curved arrow path between two pitch points. A small perpendicular
 * bow lifts overlapping actions off each other so a dozen arrows through the
 * same channel stay separable instead of merging into one dark smear.
 */
function arcPath(
  start: { x: number; y: number },
  end: { x: number; y: number }
): { d: string; ctrl: { x: number; y: number } } {
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
  return { d: `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`, ctrl: { x: cx, y: cy } };
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
  awayCrestUrl,
  color = DEFAULT_COLOR,
  actions,
  className,
  wordmark,
  builderControls,
  initialSelection,
  onSelectionChange,
}: ProgressionProps) {
  const idPrefix = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  // Consolidated selection (seeded by the host, emits every change): the type
  // filter, the drilled-in player, and the active side.
  const [selection, setSelection] = usePersistedSelection<ProgressionSelection>(
    initialSelection,
    { filter: { kind: 'all' }, activePlayer: null, selectedTeam: null },
    onSelectionChange
  );
  const { filter, activePlayer, selectedTeam: activeTeamSel } = selection;
  const setFilter = (f: ProgressionFilter) => setSelection((prev) => ({ ...prev, filter: f }));
  const setActivePlayer = (id: string | null) =>
    setSelection((prev) => ({ ...prev, activePlayer: id }));
  const setActiveTeamSel = (t: string | null) =>
    setSelection((prev) => ({ ...prev, selectedTeam: t }));

  const baseRgb = useMemo(() => parseHex(color), [color]);

  // An action's selector key: a stable id when present, else the display name.
  const playerKey = (a: ProgressionAction): string => a.playerId ?? a.player;

  // True only when actions are split across teams (so the whole-team default
  // scopes to a single side). Single-team / legacy data shows every action.
  const hasTeamSplit = useMemo(
    () => new Set(actions.map((a) => a.team).filter(Boolean)).size > 1,
    [actions]
  );

  // The team a selected player belongs to (drives the side-switch on drill-down).
  const playerTeamOf = (id: string): string | undefined =>
    actions.find((a) => playerKey(a) === id)?.team;

  // The ACTIVE side: a selected player's team, else a chosen whole-team side,
  // else the home `team`. Picking a France player therefore renders France.
  const activeTeam = resolveActiveTeam(team, activePlayer, activeTeamSel, playerTeamOf);

  // Crest for the active side — home crest for the home side, away crest for the
  // other side (when supplied); name-only when the away crest isn't baked.
  const crestForActive = activeCrest(activeTeam, team, crestUrl, awayCrestUrl);

  // Compose the player selection with the type filter. The whole-team view
  // scopes to the ACTIVE side when both teams are present.
  const matches = (a: ProgressionAction): boolean => {
    if (filter.kind === 'type' && a.type !== filter.type) return false;
    if (activePlayer !== null) return playerKey(a) === activePlayer;
    if (hasTeamSplit) return a.team === activeTeam;
    return true;
  };

  const shown = useMemo(
    () => actions.filter(matches),
    [actions, filter, activePlayer, hasTeamSplit, activeTeam]
  );

  // Data-relative xT→colour scale, fitted to the CURRENTLY-SHOWN actions. Rebuilt
  // whenever the shown set changes (type filter, player drill-down, team switch)
  // so the gradient always spans this selection's own xT range — a single
  // player's actions spread across the ramp just as the whole team's do, instead
  // of every arrow flattening to the dim end of a fixed absolute domain.
  const colorScale = useMemo(() => xtColorScale(shown.map((a) => a.xt)), [shown]);

  // Draw the brightest (highest-xT) arrows last so they sit on top of the mass.
  const ordered = useMemo(() => [...shown].sort((a, b) => a.xt - b.xt), [shown]);

  const active = useMemo(() => shown.find((a) => a.id === activeId) ?? null, [shown, activeId]);

  const totalXt = useMemo(() => shown.reduce((sum, a) => sum + a.xt, 0), [shown]);

  // Distinct players for the selector, in xT-contribution order, split by team.
  const selectablePlayers = useMemo<SelectablePlayer[]>(() => {
    const agg = new Map<string, { player: SelectablePlayer; xt: number }>();
    for (const a of actions) {
      const id = playerKey(a);
      const cur = agg.get(id);
      if (cur) cur.xt += a.xt;
      else agg.set(id, { player: { id, name: a.player, team: a.team }, xt: a.xt });
    }
    return [...agg.values()].sort((x, y) => y.xt - x.xt).map((e) => e.player);
  }, [actions]);

  const filterOptions: { value: ProgressionFilter; label: string }[] = [
    { value: { kind: 'all' }, label: 'All actions' },
    { value: { kind: 'type', type: 'carry' }, label: 'Carries' },
    { value: { kind: 'type', type: 'pass' }, label: 'Passes' },
  ];
  const filterValueLabel =
    filterOptions.find((o) => filterEq(o.value, filter))?.label ?? 'All actions';

  return (
    <div
      // Inter-first sans (product decision): opt out of the host page's
      // editorial serif so all block text/labels/ticks render in Inter.
      style={{ fontFamily: BLOCK_FONT_STACK }}
      className={cn(
        'my-6 rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4',
        'shadow-[0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-[12px] [border-top-color:rgba(255,255,255,0.10)]',
        className
      )}
    >
      {/* Header: one plain title + the player selector alongside the type filter. */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold tracking-tight text-white">Progression</span>
        <div className="flex items-center gap-1.5">
          {selectablePlayers.length > 0 && (
            <PlayerSelect
              players={selectablePlayers}
              selectedId={activePlayer}
              onSelect={setActivePlayer}
              selectedTeam={hasTeamSplit ? activeTeamSel : undefined}
              onSelectTeam={hasTeamSplit ? setActiveTeamSel : undefined}
            />
          )}
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
      </div>

      {/* Pitch + progressive actions. A container-level pointer-leave clears the
          active arrow as a backstop: each arrow clears itself on `mouseleave`,
          but flicking the pointer between two overlapping curved arrows (or off a
          thin arrow into a gap) can drop the per-arrow leave event and leave the
          callout stuck open after the pointer is gone. Clearing on leave of the
          whole pitch — and on blur leaving it — guarantees it never persists. */}
      <div
        className="relative"
        onPointerLeave={() => setActiveId(null)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setActiveId(null);
        }}
      >
        {/* `padding` insets the pitch inside the frame so an action arrow that
            ends right on the byline (into-the-box balls) — its arrowhead and head
            pip — renders fully instead of being clipped at the block edge.
            RevealOnScroll plays the entrance on scroll-in (pure enhancement — the
            arrows are always visible regardless). */}
        <RevealOnScroll>
          <Pitch variant="full" theme="dark" padding={5}>
            {ordered.map((action) => {
              const start = toPitch(action.startX, action.startY);
              const end = toPitch(action.endX, action.endY);
              const { d, ctrl } = arcPath(start, end);
              const isActive = action.id === activeId;
              const dimmed = activeId !== null && !isActive;
              const w = widthForXt(action.xt);
              // Colour is DATA-RELATIVE (scaled against the shown set's xT range),
              // so the gradient is visible on real clustered-low data. Size cues
              // (width, head pip, glow) stay on the absolute magnitude. Hover
              // emphasis comes from the width bump, glow and dimming the rest —
              // not a hue change, so the arrow keeps its true ramp colour.
              const stroke = rampColor(colorScale(action.xt), baseRgb);
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
                  // Dimmed (a sibling is hovered) stays legible context rather than
                  // near-invisible: the hovered arrow still pops via its width bump,
                  // glow and the relative fade of the rest.
                  animate={{ opacity: dimmed ? 0.3 : 1 }}
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

                  {/* The arrow. Curved; carries dashed, passes solid. Fades in on a
                    stagger (NOT a pathLength draw-in — framer-motion implements
                    pathLength via strokeDasharray, which would clobber the
                    carry/pass dash and render every arrow identically). High-xT
                    arrows glow. */}
                  <motion.path
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={isActive ? w + 0.5 : w}
                    strokeLinecap="round"
                    strokeDasharray={isCarry ? '2 1.7' : undefined}
                    markerEnd={`url(#${markerId})`}
                    initial={false}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
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
                    initial={false}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, ease: 'backOut' }}
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

            {/* Callout for the active action, drawn last so it sits on top. Uses
              the action's own (data-relative) xT colour. */}
            {active && (
              <Callout action={active} color={rampColor(colorScale(active.xt), baseRgb)} />
            )}
          </Pitch>
        </RevealOnScroll>

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
          {/* Crest for the ACTIVE side: the home crest for the home side, the
              away crest for the other side (when supplied). An away view with no
              away crest baked shows the name alone — never the wrong (home)
              badge. The label tracks the ACTIVE side. */}
          {crestForActive && <Crest url={crestForActive} className="shrink-0 rounded-none" />}
          <span className="truncate text-white/55">{activeTeam}</span>
        </div>
        <div className="flex items-center gap-3 text-white/55">
          <ThreatRamp baseRgb={baseRgb} />
          <span className="text-white/15">·</span>
          <TypeKey color={rampColor(0.7, baseRgb)} type="pass" />
          <TypeKey color={rampColor(0.7, baseRgb)} type="carry" />
        </div>
      </div>

      <PanelFooter provider="statsbomb" wordmark={wordmark} builderControls={builderControls} />
    </div>
  );
}

/**
 * Low→high xT colour-ramp legend — reads the hot/cold encoding at a glance. The
 * stops walk the full ramp (dim → amber) so the key always shows both ends; the
 * arrows themselves position along this same ramp by their data-relative xT.
 */
function ThreatRamp({ baseRgb }: { baseRgb: RGB }) {
  const stops = [0.06, 0.28, 0.5, 0.72, 1].map((t) => rampColor(t, baseRgb));
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
