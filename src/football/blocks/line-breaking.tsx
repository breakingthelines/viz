import { useId, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import { monogram } from '#/football/lib/player-name';
import { PanelFooter } from '#/football/lib/panel-footer';
import { BLOCK_FONT_STACK } from '#/football/lib/font';
import { finite } from '#/football/lib/finite';
import { ControlDropdown, DropdownItem } from '#/football/lib/control-dropdown';
import {
  activeCrest,
  PlayerSelect,
  resolveActiveTeam,
  type SelectablePlayer,
} from '#/football/lib/player-select';
import { RevealOnScroll } from '#/football/lib/reveal-on-scroll';

/** A single completed pass, in StatsBomb event coordinates (120×80). */
export interface LineBreakingPass {
  /** Stable identifier. */
  id: string;
  /** Origin x in StatsBomb units (0 = own goal line, 120 = opposition goal line). */
  startX: number;
  /** Origin y in StatsBomb units (0 = left touchline, 80 = right touchline). */
  startY: number;
  /** Destination x in StatsBomb units. */
  endX: number;
  /** Destination y in StatsBomb units. */
  endY: number;
  /**
   * Whether this pass broke a defensive line: it advances ≥10% toward goal and
   * either splits a defender pair or ends behind the opposition back line.
   */
  lineBreaking: boolean;
  /** Passer's display name, shown in the hover callout. */
  player: string;
  /**
   * Stable passer id, used by the player selector to filter to one player. Omit
   * and the selector falls back to matching on {@link LineBreakingPass.player}
   * (the display name).
   */
  playerId?: string;
  /**
   * Passer's team display name (the selector's group heading). Supply both
   * sides' passes — each tagged with its team — to split the player list by team
   * and scope the whole-team default to this panel's own `team`. Omit and the
   * default shows every pass (the original single-team behaviour).
   */
  team?: string;
  /** Passer headshot URL. When set, the hover callout shows the photo (monogram fallback). */
  imageUrl?: string;
  /** Defenders the pass cut through, in StatsBomb units. Flash as the line draws. */
  brokenDefenders: { x: number; y: number }[];
}

export interface LineBreakingProps {
  /** Team display name. */
  team: string;
  /** Home team crest URL. When set, a small crest sits before the team name. */
  crestUrl?: string;
  /**
   * Away team crest URL. When the data is team-split (both sides' passes are
   * supplied), switching the panel to the OTHER side — "{Away} — whole team" or
   * any away player — badges the read-out with this crest. Omit it (legacy /
   * home-only data) and the away view shows the name alone, never the home badge.
   */
  awayCrestUrl?: string;
  /** Team accent colour for line-breaking passes. Defaults to the home red. */
  color?: string;
  /** Completed passes to plot. */
  passes: LineBreakingPass[];
  /** Additional CSS classes for the outer panel. */
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
}

/** StatsBomb pitch is 120 long × 80 wide; the Pitch primitive is 100 × 100. */
const SB_LENGTH = 120;
const SB_WIDTH = 80;
const normX = (x: number) => finite((x * 100) / SB_LENGTH);
const normY = (y: number) => finite((y * 100) / SB_WIDTH);

type ViewMode = 'all' | 'breaks';

const MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'all', label: 'All passes' },
  { value: 'breaks', label: 'Only line breaks' },
];

/**
 * Line-breaking passes — the brand-defining BTL viz, on the quiet BTL dark
 * surface so it sits next to the Shot map. Completed passes are drawn on a dark
 * editorial pitch: ordinary passes sit faint and quiet, while line-breaking
 * passes ignite in the team colour, drawing through the defensive line with an
 * arrowhead while the defenders they split flash hot red. A clean dropdown
 * isolates the line-breakers; hovering any pass focuses it and its broken
 * defenders and names the passer.
 */
export function LineBreaking({
  team,
  crestUrl,
  awayCrestUrl,
  color = '#eb0000',
  passes,
  className,
  wordmark,
  builderControls,
}: LineBreakingProps) {
  const uid = useId();
  const arrowId = `${uid}-arrow`;
  const [mode, setMode] = useState<ViewMode>('all');
  const [activePlayer, setActivePlayer] = useState<string | null>(null);
  // The team whose whole-team view is active (team-aware mode); null = home.
  const [activeTeamSel, setActiveTeamSel] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // A pass's selector key: a stable id when present, else the display name.
  const playerKey = (p: LineBreakingPass): string => p.playerId ?? p.player;

  // Distinct passers for the selector, in first-seen order, split by team.
  const selectablePlayers = useMemo<SelectablePlayer[]>(() => {
    const seen = new Map<string, SelectablePlayer>();
    for (const p of passes) {
      const id = playerKey(p);
      if (!seen.has(id)) seen.set(id, { id, name: p.player, team: p.team });
    }
    return [...seen.values()];
  }, [passes]);

  // True only when passes are split across teams (so the whole-team default
  // scopes to a single side). Single-team / legacy data shows every pass.
  const hasTeamSplit = useMemo(
    () => new Set(passes.map((p) => p.team).filter(Boolean)).size > 1,
    [passes]
  );

  // The team a selected passer belongs to (drives the side-switch on drill-down).
  const playerTeamOf = (id: string): string | undefined =>
    passes.find((p) => playerKey(p) === id)?.team;

  // The ACTIVE side: a selected passer's team, else a chosen whole-team side,
  // else the home `team`. Picking a France passer therefore renders France.
  const activeTeam = resolveActiveTeam(team, activePlayer, activeTeamSel, playerTeamOf);

  // Crest for the active side — home crest for the home side, away crest for the
  // other side (when supplied); name-only when the away crest isn't baked.
  const crestForActive = activeCrest(activeTeam, team, crestUrl, awayCrestUrl);

  // Passes after the player filter (independent of the all/breaks view mode).
  // Whole-team view scopes to the ACTIVE side when both teams are present.
  const playerFiltered = useMemo(() => {
    if (activePlayer !== null) return passes.filter((p) => playerKey(p) === activePlayer);
    if (!hasTeamSplit) return passes;
    return passes.filter((p) => p.team === activeTeam);
  }, [passes, activePlayer, hasTeamSplit, activeTeam]);

  const breakCount = useMemo(
    () => playerFiltered.filter((p) => p.lineBreaking).length,
    [playerFiltered]
  );

  // Ordinary passes draw first (underneath), line-breakers on top so their
  // colour and the defender pulses are never occluded by quiet lines.
  const ordered = useMemo(
    () => [...playerFiltered].sort((a, b) => Number(a.lineBreaking) - Number(b.lineBreaking)),
    [playerFiltered]
  );

  const hovered = hoveredId ? (playerFiltered.find((p) => p.id === hoveredId) ?? null) : null;

  const modeValueLabel = MODE_OPTIONS.find((o) => o.value === mode)?.label ?? 'All passes';

  return (
    <div
      // Inter-first sans (product decision): opt out of the host page's
      // editorial serif so all block text/labels/ticks render in Inter.
      style={{ fontFamily: BLOCK_FONT_STACK }}
      className={cn(
        'my-6 w-full max-w-[640px] rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4',
        'shadow-[0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-[12px] [border-top-color:rgba(255,255,255,0.10)]',
        className
      )}
    >
      {/* Header: one plain title + the player selector alongside the view toggle. */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold tracking-tight text-white">Line breaks</span>
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
          <ControlDropdown label="Showing" valueLabel={modeValueLabel}>
            {(close) =>
              MODE_OPTIONS.map((o) => (
                <DropdownItem
                  key={o.value}
                  selected={o.value === mode}
                  onSelect={() => {
                    setMode(o.value);
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

      {/* Pitch. A container-level pointer-leave clears the hover as a backstop:
          each pass clears its own hover on `mouseleave`, but moving the pointer
          quickly between two overlapping pass lines (or off a thin line into a
          gap) can drop the per-line leave event, leaving the callout stuck open
          after the pointer is gone. Clearing on leave of the whole pitch — and
          on blur leaving it — guarantees the tooltip never persists. */}
      <div
        className="relative"
        onPointerLeave={() => setHoveredId(null)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setHoveredId(null);
        }}
      >
        {/* `padding` insets the pitch inside the frame so a pass that starts or
            ends right on the byline / touchline — its origin dot, arrowhead and a
            broken-defender pulse on the line — renders fully instead of being
            clipped at the block edge. RevealOnScroll plays the entrance on
            scroll-in (pure enhancement — the passes are always visible). */}
        <RevealOnScroll>
          <Pitch variant="full" theme="dark" padding={5}>
            <defs>
              <marker
                id={arrowId}
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="4.5"
                markerHeight="4.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill={color} />
              </marker>
            </defs>

            {/* Attack-direction cue, low-key. */}
            <text
              x="50"
              y="97"
              textAnchor="middle"
              fill="white"
              fillOpacity="0.22"
              fontSize="2.4"
              letterSpacing="0.6"
            >
              Attacking →
            </text>

            {ordered.map((pass) => {
              const visible = mode === 'all' || pass.lineBreaking;
              return (
                <PassLine
                  key={pass.id}
                  pass={pass}
                  visible={visible}
                  color={color}
                  arrowId={arrowId}
                  hoveredId={hoveredId}
                  anyHovered={hovered !== null}
                  onHover={setHoveredId}
                />
              );
            })}

            {/* Broken-defender pulses — drawn above the lines, only for
              line-breaking passes; flash on reveal and on hover-focus. */}
            {ordered.map((pass) => {
              if (!pass.lineBreaking) return null;
              const visible = mode === 'all' || pass.lineBreaking;
              const dim = hovered !== null && hoveredId !== pass.id;
              return (
                <BrokenDefenders
                  key={`${pass.id}-def`}
                  pass={pass}
                  visible={visible}
                  dim={dim}
                  focused={hoveredId === pass.id}
                />
              );
            })}
          </Pitch>
        </RevealOnScroll>

        {/* Hover callout — the passer's name, with an optional headshot. */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              key={hovered.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#161616]/95 py-1 pl-1 pr-3 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md"
            >
              <PasserAvatar
                name={hovered.player}
                imageUrl={hovered.imageUrl}
                color={hovered.lineBreaking ? color : 'rgba(255,255,255,0.25)'}
              />
              <span className="text-[12px] font-semibold leading-none text-white">
                {hovered.player}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Team key + count read-out — small + plain, mirrors the shot-map team key row.
          Labels the ACTIVE side, badged with that side's crest: the home crest
          for the home side, the away crest for the other side (when supplied).
          An away view with no away crest baked shows the name alone — never the
          wrong (home) badge. */}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-white/90">
        <span className="flex items-center gap-1.5">
          {crestForActive && (
            <img
              src={crestForActive}
              alt=""
              aria-hidden
              width={16}
              height={16}
              className="inline-block size-4 shrink-0 rounded object-contain align-middle"
            />
          )}
          <span className="truncate text-white/80">{activeTeam}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="tabular-nums text-white/80">{breakCount}</span>
          <span>line {breakCount === 1 ? 'break' : 'breaks'}</span>
        </span>
      </div>

      <PanelFooter provider="statsbomb" wordmark={wordmark} builderControls={builderControls} />
    </div>
  );
}

/**
 * Small circular passer headshot for the hover callout. Falls back to the
 * player's monogram when there's no photo — or when the supplied one fails to
 * load (a 404 / dead link) — so a missing image never leaves a blank chip.
 */
function PasserAvatar({
  name,
  imageUrl,
  color,
}: {
  name: string;
  imageUrl?: string;
  color: string;
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = typeof imageUrl === 'string' && imageUrl.length > 0 && !failed;
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ boxShadow: `inset 0 0 0 1px ${color}` }}
    >
      {showPhoto ? (
        <img
          src={imageUrl}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-[9px] font-semibold leading-none text-white/70">
          {monogram(name)}
        </span>
      )}
    </span>
  );
}

interface PassLineProps {
  pass: LineBreakingPass;
  visible: boolean;
  color: string;
  arrowId: string;
  hoveredId: string | null;
  anyHovered: boolean;
  onHover: (id: string | null) => void;
}

function PassLine({
  pass,
  visible,
  color,
  arrowId,
  hoveredId,
  anyHovered,
  onHover,
}: PassLineProps) {
  const x1 = normX(pass.startX);
  const y1 = normY(pass.startY);
  const x2 = normX(pass.endX);
  const y2 = normY(pass.endY);

  const isHovered = hoveredId === pass.id;
  const dimmed = anyHovered && !isHovered;
  const breaking = pass.lineBreaking;

  // Opacity: ordinary passes are quiet; line-breakers are confident. Hover
  // focus pushes the active pass forward and pulls the rest back.
  const baseOpacity = breaking ? 0.92 : 0.16;
  const targetOpacity = !visible
    ? 0
    : dimmed
      ? breaking
        ? 0.18
        : 0.05
      : isHovered
        ? 1
        : baseOpacity;

  return (
    <g
      onMouseEnter={() => visible && onHover(pass.id)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: visible ? 'pointer' : 'default' }}
    >
      {/* Invisible fat hit-line for comfortable hovering. */}
      {visible && (
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="transparent"
          strokeWidth={3}
          strokeLinecap="round"
        />
      )}

      {/* `initial={false}`: the line renders at its resting opacity (and fully
          drawn) on first paint — base visibility never depends on an entrance
          animation firing, which previously left the whole block blank when the
          mount/hydration animation tick was dropped. Opacity still animates on
          hover focus/dim (a prop-driven change after mount), so the interaction
          flourish is intact; only the one-shot draw-in entrance is dropped. */}
      <motion.line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={breaking ? color : 'white'}
        strokeWidth={breaking ? (isHovered ? 1.15 : 0.9) : 0.4}
        strokeLinecap="round"
        markerEnd={breaking ? `url(#${arrowId})` : undefined}
        initial={false}
        animate={{ pathLength: 1, opacity: targetOpacity }}
        transition={{ opacity: { duration: 0.3, ease: 'easeOut' } }}
      />

      {/* Origin dot — anchors each pass to where it was played from. */}
      <motion.circle
        cx={x1}
        cy={y1}
        r={breaking ? 0.9 : 0.6}
        fill={breaking ? color : 'white'}
        initial={false}
        animate={{ opacity: targetOpacity }}
        transition={{ duration: 0.3 }}
      />
    </g>
  );
}

interface BrokenDefendersProps {
  pass: LineBreakingPass;
  visible: boolean;
  dim: boolean;
  focused: boolean;
}

function BrokenDefenders({ pass, visible, dim, focused }: BrokenDefendersProps) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {pass.brokenDefenders.map((d, i) => {
        const cx = normX(d.x);
        const cy = normY(d.y);
        const targetOpacity = !visible ? 0 : dim ? 0.18 : 1;
        return (
          <g key={`${pass.id}-${i}`} style={{ transformOrigin: `${cx}px ${cy}px` }}>
            {/* Pulsing ring — the "broken" flash. */}
            <motion.circle
              cx={cx}
              cy={cy}
              r={1.6}
              fill="none"
              stroke="#ff2a2a"
              strokeWidth={0.4}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={
                focused
                  ? { scale: [1, 2.2, 1], opacity: [0.9, 0, 0.9] }
                  : { scale: [0.6, 1.8], opacity: [0.85, 0] }
              }
              transition={
                focused
                  ? { duration: 1.1, repeat: Infinity, ease: 'easeOut' }
                  : {
                      duration: 0.9,
                      delay: 0.45 + i * 0.12,
                      repeat: 1,
                      repeatType: 'loop',
                      ease: 'easeOut',
                    }
              }
            />
            {/* Solid defender dot. `initial={false}` so the dot is present on
                first paint (the meaningful "broken here" mark), independent of
                the entrance tick. The pulsing ring above stays a pure flourish. */}
            <motion.circle
              cx={cx}
              cy={cy}
              r={0.85}
              fill="#ff2a2a"
              initial={false}
              animate={{ opacity: targetOpacity, scale: 1 }}
              transition={{ duration: 0.3 }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
          </g>
        );
      })}
    </g>
  );
}
