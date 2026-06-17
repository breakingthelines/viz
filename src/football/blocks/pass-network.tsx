import { useId, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';

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
}

/** A weighted, directed pass volume between two players. */
export interface PassNetworkLink {
  /** Source player id. */
  from: string;
  /** Destination player id. */
  to: string;
  /** Number of passes along this edge. Scales edge width + opacity. */
  count: number;
}

export interface PassNetworkProps {
  /** Team display name, shown as the masthead title. */
  team: string;
  /** Accent colour for edges + nodes. Defaults to BTL home red. */
  color?: string;
  /** The XI as network nodes at their average locations. */
  players: PassNetworkPlayer[];
  /** Weighted pass volumes between players. */
  links: PassNetworkLink[];
  /** Additional CSS classes on the editorial plate. */
  className?: string;
}

/** StatsBomb pitch is 120×80; normalise to the 0–100 `Pitch` viewBox. */
function normX(x: number): number {
  return (x * 100) / 120;
}
function normY(y: number): number {
  return (y * 100) / 80;
}

/** Last token of a name, for the node label ("Lionel Messi" → "Messi"). */
function surname(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? name;
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
  /** Stroke width in viewBox units. */
  width: number;
  /** Base opacity (un-hovered). */
  opacity: number;
}

/**
 * Pass network — a weighted graph of an XI's average positions on the dark
 * BTL pitch. Edges are drawn first (team-colour lines whose width + opacity
 * track pass volume), then nodes (radius tracks involvement, surname beneath
 * in the house style).
 *
 * Reveal: nodes fade/scale in on a stagger. Interaction: hovering a node
 * lifts that player's edges + connected nodes and dims the rest, surfacing
 * the player's name and involvement in the colophon row.
 */
export function PassNetwork({
  team,
  color = DEFAULT_TEAM_COLOR,
  players,
  links,
  className,
}: PassNetworkProps) {
  const titleId = useId();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const nodes = useMemo<ResolvedNode[]>(() => {
    const involvements = players.map((p) => p.involvement);
    const minInv = Math.min(...involvements);
    const maxInv = Math.max(...involvements);
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
          width: scale(link.count, minC, maxC, 0.35, 2.2),
          opacity: scale(link.count, minC, maxC, 0.16, 0.6),
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
    <figure
      className={cn(
        'relative isolate overflow-hidden rounded-[14px] border border-white/[0.08]',
        'bg-gradient-to-b from-white/[0.045] to-white/[0.012] p-5',
        'shadow-[0_30px_70px_-32px_rgba(0,0,0,0.75)]',
        className
      )}
      aria-labelledby={titleId}
      style={{ fontFamily: '"le-monde-journal-std", Georgia, serif' }}
    >
      {/* Faint red top hairline */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity: 0.5,
        }}
      />

      {/* Masthead: red kicker over Le Monde serif title */}
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <div className="text-[10px] font-sans uppercase tracking-[0.2em]" style={{ color }}>
            Pass Network
          </div>
          <h3 id={titleId} className="mt-1 text-[26px] leading-none tracking-tight text-white">
            {team}
          </h3>
        </div>
        <div className="text-right text-[10px] font-sans uppercase tracking-[0.2em] text-white/40">
          Avg. Positions
        </div>
      </header>

      <div className="relative">
        <Pitch variant="full" theme="dark">
          {/* Edges first, beneath the nodes. */}
          <g>
            {edges.map((edge) => {
              const dimmed =
                connectedIds !== null &&
                !(connectedIds.has(edge.from.id) && connectedIds.has(edge.to.id));
              const lifted =
                hoveredId !== null && (edge.from.id === hoveredId || edge.to.id === hoveredId);
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
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: dimmed
                      ? edge.opacity * 0.12
                      : lifted
                        ? Math.min(1, edge.opacity + 0.35)
                        : edge.opacity,
                  }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  style={{ pointerEvents: 'none' }}
                />
              );
            })}
          </g>

          {/* Nodes, staggered in. */}
          {nodes.map((node, index) => {
            const isHovered = node.id === hoveredId;
            const dimmed = connectedIds !== null && !connectedIds.has(node.id);
            const labelDimmed = dimmed;
            return (
              <motion.g
                key={node.id}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: dimmed ? 0.28 : 1, scale: 1 }}
                transition={{
                  opacity: { duration: 0.35, delay: hoveredId ? 0 : 0.15 + index * 0.05 },
                  scale: {
                    type: 'spring',
                    stiffness: 320,
                    damping: 22,
                    delay: hoveredId ? 0 : 0.15 + index * 0.05,
                  },
                }}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: 'pointer', transformOrigin: `${node.cx}px ${node.cy}px` }}
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

                {/* Node disc */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={node.r}
                  fill={color}
                  stroke="white"
                  strokeWidth={0.3}
                  fillOpacity={isHovered ? 1 : 0.92}
                />

                {/* Surname label, house style */}
                <text
                  x={node.cx}
                  y={node.cy + node.r + 2.7}
                  textAnchor="middle"
                  fill="white"
                  fontSize="2.4"
                  fontWeight="600"
                  opacity={labelDimmed ? 0.3 : isHovered ? 1 : 0.9}
                  style={{ pointerEvents: 'none', fontFamily: 'inherit' }}
                >
                  {surname(node.name)}
                </text>
              </motion.g>
            );
          })}
        </Pitch>
      </div>

      {/* Footer colophon — doubles as the hover read-out. */}
      <footer className="mt-4 flex items-center justify-between text-[10px] font-sans uppercase tracking-[0.2em]">
        <span className="text-white/40">Data · StatsBomb</span>
        <span className="tabular-nums text-white/55">
          {hoveredNode ? (
            <>
              <span style={{ color }}>{hoveredNode.name}</span>
              <span className="text-white/30"> · </span>
              <span className="text-white/70">{hoveredNode.involvement} involvements</span>
            </>
          ) : (
            <>
              {players.length} players · {links.length} links
            </>
          )}
        </span>
      </footer>
    </figure>
  );
}
