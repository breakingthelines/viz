import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import { surname } from '#/football/lib/player-name';
import { PanelFooter } from '#/football/lib/panel-footer';
import { BLOCK_FONT_STACK } from '#/football/lib/font';
import { SvgHeadshot } from '#/football/lib/headshot';
import { finite } from '#/football/lib/finite';
import { PlayerSelect, type SelectablePlayer, type SquadScope } from '#/football/lib/player-select';
import { RevealOnScroll } from '#/football/lib/reveal-on-scroll';

/** Default BTL home-team accent. */
const DEFAULT_TEAM_COLOR = '#eb0000';

/** A node in the pass network: a player at their average pitch location. */
export interface PassNetworkPlayer {
  /** Stable identifier, referenced by {@link PassNetworkLink.from}/`to`. */
  id: string;
  /** Display name. The surname is shown under the node. */
  name: string;
  /**
   * Average x location on the StatsBomb scale (0–120, low = own goal line).
   * Normalised internally to the 0–100 pitch.
   */
  x: number;
  /**
   * Average y location on the StatsBomb scale (0–80, 0 = left touchline).
   * Normalised internally to the 0–100 pitch.
   */
  y: number;
  /**
   * Relative passing involvement (any positive scale — e.g. passes
   * received + played). Scales the node radius across the XI.
   */
  involvement: number;
  /**
   * Player headshot URL. When set, the node renders the photo clipped to the
   * disc (monogram is not used); when absent, the node shows initials.
   */
  imageUrl?: string;
  /**
   * Team display name (the selector's group heading). Supply both sides' players
   * — each tagged with its team — to split the selector list by team and scope
   * the whole-team view to this panel's own `team`. Omit (the single-team case)
   * and players render as one flat list — the original behaviour.
   */
  team?: string;
  /**
   * Whether this player started the match. When at least one node carries the
   * flag, the whole-team view defaults to the starting XI (a Starters / Subs
   * toggle switches the set), because a full graph including subs is cramped.
   * Omit on every node and the toggle is hidden and all supplied nodes render
   * (the original behaviour).
   */
  starter?: boolean;
}

/** A weighted, directed pass volume between two players. */
export interface PassNetworkLink {
  /** Source player id. */
  from: string;
  /** Destination player id. */
  to: string;
  /** Number of passes along this edge. Scales edge width. */
  count: number;
}

export interface PassNetworkProps {
  /** Team display name, shown as the panel title's subject. */
  team: string;
  /** Team crest URL. Rendered as a small badge before the team name. */
  crestUrl?: string;
  /** Accent colour for edges + nodes. Defaults to BTL home red. */
  color?: string;
  /** The XI as network nodes at their average locations. */
  players: PassNetworkPlayer[];
  /** Weighted pass volumes between players. */
  links: PassNetworkLink[];
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
}

/** StatsBomb pitch is 120×80; normalise to the 0–100 `Pitch` viewBox. */
function normX(x: number): number {
  return finite((x * 100) / 120);
}
function normY(y: number): number {
  return finite((y * 100) / 80);
}

/**
 * Linear map of `value` from `[inMin, inMax]` onto `[outMin, outMax]`, clamped.
 * Any non-finite input (a missing involvement, an all-`undefined` domain) maps
 * to the mid-output so a node radius is never NaN.
 */
function scale(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const mid = (outMin + outMax) / 2;
  if (!Number.isFinite(value) || inMax <= inMin) return mid;
  const t = Math.min(1, Math.max(0, (value - inMin) / (inMax - inMin)));
  return finite(outMin + t * (outMax - outMin), mid);
}

interface ResolvedNode extends PassNetworkPlayer {
  /** Normalised pitch x (0–100). */
  cx: number;
  /** Normalised pitch y (0–100). */
  cy: number;
  /** Node radius in viewBox units. */
  r: number;
  /** Surname is rendered ABOVE the disc (vs the default below) to dodge a clash. */
  labelAbove: boolean;
}

interface ResolvedEdge {
  key: string;
  from: ResolvedNode;
  to: ResolvedNode;
  count: number;
  /** Stroke width in viewBox units (tracks pass volume). */
  width: number;
  /** Resting opacity (tracks pass volume), so weight reads without a hover. */
  restOpacity: number;
}

// Edge weight reads off BOTH width and opacity at rest, so the heavy build-up
// channels (full-back ↔ midfield, the midfield triangle) stand out as thick,
// solid lines while incidental connections recede to thin and faint — the
// passing shape, not an undifferentiated tangle. Hover then lifts the focused
// player's web to full strength and fades the rest right back.
const EDGE_DIM_OPACITY = 0.07;
const EDGE_LIFT_OPACITY = 0.92;
const NODE_DIM_OPACITY = 0.24;

// Resting per-edge opacity ramps with pass volume across [floor, ceil] so a
// low-volume edge is visibly fainter than a heavy one even before any hover.
const EDGE_REST_OPACITY_MIN = 0.22;
const EDGE_REST_OPACITY_MAX = 0.82;

// Resting edge stroke width (viewBox units) across the volume range. A wide
// band (vs the old 0.4–2.2) so the thickest channels clearly out-weigh the
// thinnest, making the team's main passing lanes legible at a glance.
const EDGE_WIDTH_MIN = 0.45;
const EDGE_WIDTH_MAX = 3.4;

/**
 * Pass network — a weighted graph of an XI's average positions on the dark BTL
 * pitch, styled to sit quietly next to the Shot map. Edges are drawn first
 * (team-colour lines whose width tracks pass volume), then nodes (radius tracks
 * involvement; a headshot fills the disc when available, else a monogram), with
 * the surname beneath.
 *
 * Resting state is full and uniform. Hovering a node lifts that player's edges
 * and connected nodes and fades everything else, surfacing the player's name
 * and involvement in the legend row.
 */
export function PassNetwork({
  team,
  crestUrl,
  color = DEFAULT_TEAM_COLOR,
  players,
  links,
  className,
  wordmark,
  builderControls,
}: PassNetworkProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Selector state: the chosen player (null = whole team) + the squad scope.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scope, setScope] = useState<SquadScope>('starters');

  // Whether the data carries starter flags / a team split — gates the squad
  // toggle and the team grouping. Untagged legacy data keeps the old behaviour.
  const hasStarterFlags = useMemo(() => players.some((p) => p.starter !== undefined), [players]);
  const hasTeamSplit = useMemo(
    () => new Set(players.map((p) => p.team).filter(Boolean)).size > 1,
    [players]
  );

  // Players offered in the selector, split by team.
  const selectablePlayers = useMemo<SelectablePlayer[]>(
    () => players.map((p) => ({ id: p.id, name: p.name, team: p.team })),
    [players]
  );

  // The nodes actually drawn: this panel's side (when split), narrowed to the
  // active squad scope when starter flags are present; else every supplied node.
  // A chosen player is NOT removed from the graph — a single isolated node loses
  // the network's meaning — but drives a persistent ego-highlight (below).
  //
  // Subs scope is special. A sub-to-sub-only graph is almost always near-empty
  // (substitutes rarely pass to each other), so Subs instead shows each sub's
  // passes to ANYONE — their involvement across the whole side. The drawn set is
  // therefore the subs PLUS every team-mate they connected to over a link; the
  // sub nodes are the subject and their pass partners are drawn as context so the
  // edges have somewhere to land. (Starters scope is unchanged: just the XI.)
  const visiblePlayers = useMemo(() => {
    const sideSet = hasTeamSplit ? players.filter((p) => p.team === team) : players;
    if (!hasStarterFlags) {
      let set = sideSet;
      if (selectedId !== null && !set.some((p) => p.id === selectedId)) {
        const sel = players.find((p) => p.id === selectedId);
        if (sel) set = [...set, sel];
      }
      return set;
    }

    let set: PassNetworkPlayer[];
    if (scope === 'subs') {
      const sideIds = new Set(sideSet.map((p) => p.id));
      const subIds = new Set(sideSet.filter((p) => p.starter === false).map((p) => p.id));
      // Pull in the on-side team-mates each sub passed to / received from, so a
      // sub's web reaches the whole team rather than only other subs.
      const partnerIds = new Set<string>();
      for (const l of links) {
        if (subIds.has(l.from) && sideIds.has(l.to)) partnerIds.add(l.to);
        if (subIds.has(l.to) && sideIds.has(l.from)) partnerIds.add(l.from);
      }
      set = sideSet.filter((p) => subIds.has(p.id) || partnerIds.has(p.id));
    } else {
      set = sideSet.filter((p) => p.starter === true);
    }
    // Keep a selected player visible even if the active scope would hide it (e.g.
    // a sub selected while the toggle is on Starters), so the drill-down holds.
    if (selectedId !== null && !set.some((p) => p.id === selectedId)) {
      const sel = players.find((p) => p.id === selectedId);
      if (sel) set = [...set, sel];
    }
    return set;
  }, [players, links, hasTeamSplit, team, hasStarterFlags, scope, selectedId]);

  // In Subs scope, the subs are the SUBJECT and their pass partners are drawn as
  // context — only edges that TOUCH a sub are shown, so the panel reads as "the
  // subs' involvement" rather than the full starter web reappearing.
  const subIdSet = useMemo(() => {
    if (!hasStarterFlags || scope !== 'subs') return null;
    const sideSet = hasTeamSplit ? players.filter((p) => p.team === team) : players;
    return new Set(sideSet.filter((p) => p.starter === false).map((p) => p.id));
  }, [players, hasStarterFlags, scope, hasTeamSplit, team]);

  const nodes = useMemo<ResolvedNode[]>(() => {
    const involvements = visiblePlayers.map((p) => p.involvement);
    const minInv = involvements.length ? Math.min(...involvements) : 0;
    const maxInv = involvements.length ? Math.max(...involvements) : 1;
    const placed = visiblePlayers.map((p) => ({
      ...p,
      cx: normX(p.x),
      cy: normY(p.y),
      r: scale(p.involvement, minInv, maxInv, 2.4, 4.6),
    }));

    // Resolve label collisions. The surname normally sits just BELOW the disc;
    // when another node sits where that label would land (close in x, a little
    // lower in y) the two names stack on top of each other — the Acuña / Di María
    // clash. For each node, if a near-horizontal neighbour occupies its
    // below-label band, flip the label ABOVE instead. A node only flips when its
    // own slot is contested and the space above is clearer, so isolated nodes
    // keep the consistent below-disc placement.
    const LABEL_DROP = 4.2; // ~ r + label offset, the band the name occupies
    const X_NEAR = 7; // names within this x-gap can physically overlap
    return placed.map((node, i) => {
      let belowBlocked = false;
      let aboveBlocked = false;
      for (let j = 0; j < placed.length; j++) {
        if (j === i) continue;
        const other = placed[j]!;
        if (Math.abs(other.cx - node.cx) > X_NEAR) continue;
        const dy = other.cy - node.cy;
        // A neighbour sitting just below intrudes on the below-label slot…
        if (dy > 0 && dy < LABEL_DROP + other.r) belowBlocked = true;
        // …and one just above intrudes on the above-label slot.
        if (dy < 0 && -dy < LABEL_DROP + other.r) aboveBlocked = true;
      }
      return { ...node, labelAbove: belowBlocked && !aboveBlocked };
    });
  }, [visiblePlayers]);

  const nodeById = useMemo(() => {
    const map = new Map<string, ResolvedNode>();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  const edges = useMemo<ResolvedEdge[]>(() => {
    const counts = links.map((l) => l.count);
    const minC = counts.length ? Math.min(...counts) : 0;
    const maxC = counts.length ? Math.max(...counts) : 1;
    return links.flatMap((link) => {
      const from = nodeById.get(link.from);
      const to = nodeById.get(link.to);
      if (!from || !to) return [];
      // Subs scope: only keep edges that TOUCH a sub, so the panel shows the subs'
      // passes to anyone (their involvement) rather than redrawing the full
      // starter web among the pass partners we pulled in as context.
      if (subIdSet && !subIdSet.has(link.from) && !subIdSet.has(link.to)) return [];
      // A mild sqrt-eased volume fraction lifts mid-volume edges off the floor
      // so the gradient from incidental → heavy reads across the whole range,
      // not just at the extremes.
      const frac = Math.sqrt(scale(link.count, minC, maxC, 0, 1));
      return [
        {
          key: `${link.from}->${link.to}`,
          from,
          to,
          count: link.count,
          width: EDGE_WIDTH_MIN + frac * (EDGE_WIDTH_MAX - EDGE_WIDTH_MIN),
          restOpacity:
            EDGE_REST_OPACITY_MIN + frac * (EDGE_REST_OPACITY_MAX - EDGE_REST_OPACITY_MIN),
        },
      ];
    });
  }, [links, nodeById, subIdSet]);

  // Effective focus: an explicit hover wins; otherwise a selected player drives
  // a persistent ego-highlight so a drill-down reads as "this player's web"
  // without a hover. (The node set isn't reduced — see `visiblePlayers`.)
  const focusId = hoveredId ?? selectedId;

  /** Player ids one hop from the focused node (incl. itself). */
  const connectedIds = useMemo(() => {
    if (!focusId) return null;
    const set = new Set<string>([focusId]);
    for (const e of edges) {
      if (e.from.id === focusId) set.add(e.to.id);
      if (e.to.id === focusId) set.add(e.from.id);
    }
    return set;
  }, [edges, focusId]);

  const focusedNode = focusId ? (nodeById.get(focusId) ?? null) : null;

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
      {/* Header: one plain title + the player selector (with a Starters/Subs
          toggle when starter flags are present). */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold tracking-tight text-white">Pass network</span>
        {selectablePlayers.length > 0 ? (
          <PlayerSelect
            players={selectablePlayers}
            selectedId={selectedId}
            onSelect={setSelectedId}
            scope={hasStarterFlags ? scope : undefined}
            onScopeChange={hasStarterFlags ? setScope : undefined}
          />
        ) : (
          <span className="text-[11px] tabular-nums text-white/55">
            <span className="inline-flex items-center gap-1.5 text-white/40">
              <Crest url={crestUrl} name={team} />
              {team}
            </span>
          </span>
        )}
      </div>

      {/* Landscape 3:2 frame — a real pitch aspect. The `Pitch` markings live in
          a 100×100 viewBox laid out as a LANDSCAPE pitch (goals left/right,
          penalty boxes at the 0 / 100 ends), so a 3:2 box renders the pitch in
          its true proportions and the XI — average positions on the StatsBomb
          120×80 scale, normalised to 0–100 and attacking left→right — spreads
          legibly across the width. (The previous square box mapped the 100×100
          viewBox 1:1, which stood the pitch up tall and squeezed the shape into a
          narrow upright column; this matches the lineup-pitch convention.) The
          intrinsic `aspect-[3/2]` on `Pitch` drives the box height, so no wrapper
          aspect/inset is needed. */}
      <RevealOnScroll className="relative w-full">
        {/* `padding` insets the pitch inside the frame so a node whose average
            position sits near a touchline / byline — its headshot disc (r up to
            ~4.6) plus the surname label above/below it — renders fully instead of
            being clipped at the block edge. The reveal plays on scroll-in (pure
            enhancement — the network is always visible regardless). */}
        <Pitch variant="full" theme="dark" padding={6} className="w-full">
          {/* Edges first, beneath the nodes. */}
          <g>
            {edges.map((edge) => {
              const lifted =
                focusId !== null && (edge.from.id === focusId || edge.to.id === focusId);
              const dimmed = focusId !== null && !lifted;
              return (
                <motion.line
                  key={edge.key}
                  x1={edge.from.cx}
                  y1={edge.from.cy}
                  x2={edge.to.cx}
                  y2={edge.to.cy}
                  stroke={color}
                  strokeWidth={lifted ? edge.width * 1.3 : edge.width}
                  strokeLinecap="round"
                  initial={false}
                  animate={{
                    opacity: dimmed
                      ? EDGE_DIM_OPACITY
                      : lifted
                        ? EDGE_LIFT_OPACITY
                        : edge.restOpacity,
                  }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{ pointerEvents: 'none' }}
                />
              );
            })}
          </g>

          {/* Nodes. */}
          {nodes.map((node) => {
            const isHovered = node.id === focusId;
            const dimmed = connectedIds !== null && !connectedIds.has(node.id);
            return (
              <motion.g
                key={node.id}
                initial={false}
                animate={{ opacity: dimmed ? NODE_DIM_OPACITY : 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: 'pointer' }}
                aria-label={`${node.name}, involvement ${node.involvement}`}
              >
                {/* Hover halo */}
                {isHovered && (
                  <motion.circle
                    cx={node.cx}
                    cy={node.cy}
                    r={node.r + 1.6}
                    fill="none"
                    stroke={color}
                    strokeWidth={0.4}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.7, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    style={{ transformOrigin: `${node.cx}px ${node.cy}px`, pointerEvents: 'none' }}
                  />
                )}

                {/* Headshot clipped to the node disc (coloured backing + ring so
                    a transparent / loading / 404 photo still reads), else a solid
                    disc + monogram — also used when the photo fails to load. */}
                <SvgHeadshot
                  cx={node.cx}
                  cy={node.cy}
                  r={node.r}
                  name={node.name}
                  imageUrl={node.imageUrl}
                  color={color}
                  ringColor="white"
                  ringWidth={0.4}
                  ringOpacity={isHovered ? 0.9 : 0.6}
                  backingOpacity={isHovered ? 1 : 0.92}
                  monogramFill="white"
                  monogramSizeRatio={0.82}
                  fallbackStroke="white"
                  fallbackStrokeWidth={0.3}
                />

                {/* Surname label — below the disc by default, flipped above when
                    a near neighbour would otherwise collide with it. A faint dark
                    halo (paint-order: stroke) keeps the name legible where it
                    crosses a bright edge or another node. */}
                <text
                  x={node.cx}
                  y={node.labelAbove ? node.cy - node.r - 1.6 : node.cy + node.r + 2.7}
                  textAnchor="middle"
                  fill="white"
                  fontSize="2.4"
                  fontWeight="600"
                  opacity={isHovered ? 1 : 0.9}
                  stroke="#0a0a0a"
                  strokeWidth={0.7}
                  strokeOpacity={0.55}
                  paintOrder="stroke"
                  style={{ pointerEvents: 'none' }}
                >
                  {surname(node.name)}
                </text>
              </motion.g>
            );
          })}
        </Pitch>
      </RevealOnScroll>

      {/* Legend — the focused player's read-out, else team + visible counts. */}
      <div className="mt-3 flex items-center gap-4 text-[11px] text-white/90">
        {focusedNode ? (
          <span className="tabular-nums">
            <span style={{ color }}>{focusedNode.name}</span>
            <span className="text-white/30"> · </span>
            <span className="text-white/70">{focusedNode.involvement} involvements</span>
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <Crest url={crestUrl} name={team} />
              <span className="truncate">{team}</span>
            </span>
            <span className="tabular-nums text-white/90">
              {nodes.length} players · {edges.length} links
            </span>
          </>
        )}
      </div>

      <PanelFooter provider="statsbomb" wordmark={wordmark} builderControls={builderControls} />
    </div>
  );
}

/** Small ~16px team crest rendered before a team name. Nothing when absent. */
function Crest({ url, name }: { url?: string; name: string }) {
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      aria-hidden
      width={16}
      height={16}
      className="inline-block size-4 rounded object-contain align-middle"
      title={name}
    />
  );
}
