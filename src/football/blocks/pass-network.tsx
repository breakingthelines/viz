import { useId, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import { monogram, surname } from '#/football/lib/player-name';
import { PanelFooter } from '#/football/lib/panel-footer';

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
}

/** StatsBomb pitch is 120×80; normalise to the 0–100 `Pitch` viewBox. */
function normX(x: number): number {
  return (x * 100) / 120;
}
function normY(y: number): number {
  return (y * 100) / 80;
}

/** Linear map of `value` from `[inMin, inMax]` onto `[outMin, outMax]`, clamped. */
function scale(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (inMax <= inMin) return (outMin + outMax) / 2;
  const t = Math.min(1, Math.max(0, (value - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}

interface ResolvedNode extends PassNetworkPlayer {
  /** Normalised pitch x (0–100). */
  cx: number;
  /** Normalised pitch y (0–100). */
  cy: number;
  /** Node radius in viewBox units. */
  r: number;
}

interface ResolvedEdge {
  key: string;
  from: ResolvedNode;
  to: ResolvedNode;
  count: number;
  /** Stroke width in viewBox units (tracks pass volume). */
  width: number;
}

// At rest the whole network sits at one calm, uniform strength; only volume
// drives edge *width*, never opacity, so no node or edge reads as dimmed until
// the reader hovers. Hover then lifts the focused player's web and fades the rest.
const EDGE_REST_OPACITY = 0.5;
const EDGE_DIM_OPACITY = 0.08;
const EDGE_LIFT_OPACITY = 0.85;
const NODE_DIM_OPACITY = 0.24;

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
}: PassNetworkProps) {
  const clipPrefix = useId();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const nodes = useMemo<ResolvedNode[]>(() => {
    const involvements = players.map((p) => p.involvement);
    const minInv = involvements.length ? Math.min(...involvements) : 0;
    const maxInv = involvements.length ? Math.max(...involvements) : 1;
    return players.map((p) => ({
      ...p,
      cx: normX(p.x),
      cy: normY(p.y),
      r: scale(p.involvement, minInv, maxInv, 2.4, 4.6),
    }));
  }, [players]);

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
      return [
        {
          key: `${link.from}->${link.to}`,
          from,
          to,
          count: link.count,
          width: scale(link.count, minC, maxC, 0.4, 2.2),
        },
      ];
    });
  }, [links, nodeById]);

  /** Player ids one hop from the hovered node (incl. itself). */
  const connectedIds = useMemo(() => {
    if (!hoveredId) return null;
    const set = new Set<string>([hoveredId]);
    for (const e of edges) {
      if (e.from.id === hoveredId) set.add(e.to.id);
      if (e.to.id === hoveredId) set.add(e.from.id);
    }
    return set;
  }, [edges, hoveredId]);

  const hoveredNode = hoveredId ? (nodeById.get(hoveredId) ?? null) : null;

  return (
    <div
      className={cn(
        'my-6 rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4',
        'shadow-[0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-[12px] [border-top-color:rgba(255,255,255,0.10)]',
        className
      )}
    >
      {/* Header: one plain title + small legend read-out. */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold tracking-tight text-white">Pass network</span>
        <span className="text-[11px] tabular-nums text-white/55">
          {hoveredNode ? (
            <>
              <span style={{ color }}>{hoveredNode.name}</span>
              <span className="text-white/30"> · </span>
              <span className="text-white/70">{hoveredNode.involvement} involvements</span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-white/40">
              <Crest url={crestUrl} name={team} />
              {team}
            </span>
          )}
        </span>
      </div>

      <div className="relative">
        <Pitch variant="full" theme="dark">
          {/* Edges first, beneath the nodes. */}
          <g>
            {edges.map((edge) => {
              const lifted =
                hoveredId !== null && (edge.from.id === hoveredId || edge.to.id === hoveredId);
              const dimmed = hoveredId !== null && !lifted;
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
                        : EDGE_REST_OPACITY,
                  }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{ pointerEvents: 'none' }}
                />
              );
            })}
          </g>

          {/* Nodes. */}
          {nodes.map((node) => {
            const isHovered = node.id === hoveredId;
            const dimmed = connectedIds !== null && !connectedIds.has(node.id);
            const showHeadshot = Boolean(node.imageUrl);
            const clipId = `${clipPrefix}-node-${node.id}`;
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

                {showHeadshot ? (
                  <>
                    {/* Headshot clipped to the node disc; coloured backing +
                        ring so a transparent / loading photo still reads. */}
                    <defs>
                      <clipPath id={clipId}>
                        <circle cx={node.cx} cy={node.cy} r={node.r} />
                      </clipPath>
                    </defs>
                    <circle cx={node.cx} cy={node.cy} r={node.r} fill={color} fillOpacity={0.92} />
                    <image
                      href={node.imageUrl}
                      x={node.cx - node.r}
                      y={node.cy - node.r}
                      width={node.r * 2}
                      height={node.r * 2}
                      clipPath={`url(#${clipId})`}
                      preserveAspectRatio="xMidYMid slice"
                      style={{ pointerEvents: 'none' }}
                    />
                    <circle
                      cx={node.cx}
                      cy={node.cy}
                      r={node.r}
                      fill="none"
                      stroke="white"
                      strokeWidth={0.4}
                      strokeOpacity={isHovered ? 0.9 : 0.6}
                    />
                  </>
                ) : (
                  <>
                    {/* Solid disc + monogram fallback. */}
                    <circle
                      cx={node.cx}
                      cy={node.cy}
                      r={node.r}
                      fill={color}
                      stroke="white"
                      strokeWidth={0.3}
                      fillOpacity={isHovered ? 1 : 0.92}
                    />
                    <text
                      x={node.cx}
                      y={node.cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize={node.r * 0.82}
                      fontWeight="bold"
                      style={{ pointerEvents: 'none' }}
                    >
                      {monogram(node.name)}
                    </text>
                  </>
                )}

                {/* Surname label */}
                <text
                  x={node.cx}
                  y={node.cy + node.r + 2.7}
                  textAnchor="middle"
                  fill="white"
                  fontSize="2.4"
                  fontWeight="600"
                  opacity={isHovered ? 1 : 0.9}
                  style={{ pointerEvents: 'none' }}
                >
                  {surname(node.name)}
                </text>
              </motion.g>
            );
          })}
        </Pitch>
      </div>

      {/* Legend — small data dot + counts. */}
      <div className="mt-3 flex items-center gap-4 text-[11px] text-white/90">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
          <Crest url={crestUrl} name={team} />
          <span className="truncate">{team}</span>
        </span>
        <span className="tabular-nums text-white/90">
          {players.length} players · {links.length} links
        </span>
      </div>

      <PanelFooter provider="statsbomb" wordmark={wordmark} />
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
