import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import { surname } from '#/football/lib/player-name';
import { PanelFooter } from '#/football/lib/panel-footer';

/** BTL team accents — the only two colours on the control surface. */
const HOME_COLOR = '#eb0000';
const AWAY_COLOR = '#0091eb';

/** A player at a fixed location, in StatsBomb pitch coordinates (120 × 80). */
export interface PitchControlPlayer {
  /** Stable id (used for hover emphasis). */
  id: string;
  /** StatsBomb x (0 = own goal line, 120 = opposition goal line). */
  x: number;
  /** StatsBomb y (0 = left touchline, 80 = right touchline). */
  y: number;
  /** Which side the player belongs to. */
  team: 'home' | 'away';
  /** Display name, surfaced in the hover callout. */
  name?: string;
  /** Marks the goalkeeper — rendered as a hollow ringed dot. */
  isGoalkeeper?: boolean;
}

export interface PitchControlProps {
  /** Home team display name (controls the red side). */
  homeTeam: string;
  /** Away team display name (controls the blue side). */
  awayTeam: string;
  /** Home team crest URL. When set, a small crest sits before the home name. */
  homeCrestUrl?: string;
  /** Away team crest URL. When set, a small crest sits before the away name. */
  awayCrestUrl?: string;
  /** Every player on the pitch — both teams, fixed positions. */
  players: PitchControlPlayer[];
  /** Additional CSS classes on the outer panel. */
  className?: string;
}

/** StatsBomb pitch dimensions. */
const SB_LENGTH = 120;
const SB_WIDTH = 80;

/** Control-surface grid resolution (cells across × down). Coarse + fast. */
const GRID_W = 60;
const GRID_H = 40;

/**
 * Distance floor (in grid units, squared) so a player standing on a cell does
 * not produce an infinite 1/d² influence — keeps the falloff soft, not spiky.
 */
const MIN_DIST_SQ = 2.2;

/** A player resolved to grid-space, with the normalised pitch coords for SVG. */
interface ResolvedPlayer extends PitchControlPlayer {
  /** Grid-space x (0..GRID_W). */
  gx: number;
  /** Grid-space y (0..GRID_H). */
  gy: number;
  /** Normalised pitch x (0..100) for the SVG dot. */
  cx: number;
  /** Normalised pitch y (0..100) for the SVG dot. */
  cy: number;
}

/**
 * Space / pitch control — a calm territory wash over the dark BTL pitch, styled
 * to sit quietly next to the Shot map. Each cell of a coarse grid is assigned a
 * soft, distance-weighted (1/d²) influence from every player; the cell is shaded
 * toward the home (red) or away (blue) side by whichever team dominates, with
 * opacity scaled by the *margin* of control so contested midfield stays
 * near-transparent and owned zones read as a low wash. The low-res grid is drawn
 * up-scaled with smoothing, giving a soft gradient falloff rather than hard
 * Voronoi edges. Player dots sit on top.
 *
 * A small split bar + plain tabular readout report each side's share of pitch
 * area. Hovering a player blooms their own region and rings their dot.
 */
export function PitchControl({
  homeTeam,
  awayTeam,
  homeCrestUrl,
  awayCrestUrl,
  players,
  className,
}: PitchControlProps) {
  const titleId = useId();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const resolved = useMemo<ResolvedPlayer[]>(
    () =>
      players.map((p) => ({
        ...p,
        gx: (p.x / SB_LENGTH) * GRID_W,
        gy: (p.y / SB_WIDTH) * GRID_H,
        cx: (p.x * 100) / SB_LENGTH,
        cy: (p.y * 100) / SB_WIDTH,
      })),
    [players]
  );

  // Per-cell owner ('home'/'away'/null) + control margin (0..1), plus the
  // resulting area share for each side. Recomputed only when players move.
  const { share } = useMemo(() => computeControl(resolved), [resolved]);

  const hovered = hoveredId ? (resolved.find((p) => p.id === hoveredId) ?? null) : null;

  const homePct = Math.round(share.home * 100);
  const awayPct = 100 - homePct;

  return (
    <figure
      aria-labelledby={titleId}
      className={cn(
        'relative isolate my-6 w-full max-w-[560px] overflow-hidden rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4',
        'shadow-[0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-[12px] [border-top-color:rgba(255,255,255,0.10)]',
        className
      )}
    >
      {/* Header: one plain title + a small split bar with a tabular readout. */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <span id={titleId} className="shrink-0 text-[13px] font-semibold tracking-tight text-white">
          Pitch control
        </span>
        {/* Share of pitch area: split bar + plain tabular figures. */}
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-1 w-24 overflow-hidden rounded-full bg-white/[0.06]"
            role="img"
            aria-label={`${homeTeam} ${homePct}% of pitch, ${awayTeam} ${awayPct}%`}
          >
            <motion.span
              className="h-full"
              style={{ backgroundColor: HOME_COLOR }}
              initial={{ width: '50%' }}
              animate={{ width: `${homePct}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.span
              className="h-full flex-1"
              style={{ backgroundColor: AWAY_COLOR }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              transition={{ duration: 0.7 }}
            />
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-white/60">
            <span style={{ color: HOME_COLOR }}>{homePct}</span>
            <span className="text-white/30"> / </span>
            <span style={{ color: AWAY_COLOR }}>{awayPct}</span>
          </span>
        </div>
      </div>

      {/* Pitch + control-surface canvas overlay (square box). */}
      <div className="relative aspect-square w-full">
        <Pitch
          variant="full"
          theme="dark"
          className="absolute inset-0 !aspect-square h-full w-full"
        />
        <ControlCanvas players={resolved} hoveredId={hoveredId} />

        {/* Player dots — SVG over the canvas, on the same 0..100 viewBox. */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          {resolved.map((p) => {
            const color = p.team === 'home' ? HOME_COLOR : AWAY_COLOR;
            const isHovered = p.id === hoveredId;
            const dimmed = hoveredId !== null && !isHovered;
            return (
              <motion.g
                key={p.id}
                onMouseEnter={() => setHoveredId(p.id)}
                onMouseLeave={() => setHoveredId(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: dimmed ? 0.5 : 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{ cursor: 'pointer' }}
                aria-label={`${p.team === 'home' ? homeTeam : awayTeam} player${
                  p.isGoalkeeper ? ' (goalkeeper)' : ''
                }`}
              >
                {/* Hover ring. */}
                {isHovered && (
                  <motion.circle
                    cx={p.cx}
                    cy={p.cy}
                    r={3.2}
                    fill="none"
                    stroke={color}
                    strokeWidth={0.5}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 0.9, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    style={{ transformOrigin: `${p.cx}px ${p.cy}px`, pointerEvents: 'none' }}
                  />
                )}
                {p.isGoalkeeper ? (
                  // GK — hollow ringed dot, distinct from outfield.
                  <circle
                    cx={p.cx}
                    cy={p.cy}
                    r={1.5}
                    fill="#0a0a0a"
                    stroke={color}
                    strokeWidth={0.7}
                  />
                ) : (
                  <circle
                    cx={p.cx}
                    cy={p.cy}
                    r={1.5}
                    fill={color}
                    stroke="white"
                    strokeWidth={0.3}
                    fillOpacity={0.95}
                  />
                )}
              </motion.g>
            );
          })}

          {/* Name callout for the hovered player — drawn last, on top. */}
          {hovered?.name && (
            <HoverLabel
              cx={hovered.cx}
              cy={hovered.cy}
              label={surname(hovered.name)}
              color={hovered.team === 'home' ? HOME_COLOR : AWAY_COLOR}
            />
          )}
        </svg>

        {/* Attack-direction cue (home attacks right) — quiet, no eyebrow. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-1.5 flex justify-center">
          <span className="flex items-center gap-1.5 text-[10px] text-white/90">
            {homeCrestUrl && (
              <img
                src={homeCrestUrl}
                alt=""
                aria-hidden
                width={16}
                height={16}
                className="inline-block size-4 shrink-0 rounded object-contain align-middle"
              />
            )}
            {homeTeam} attacking <span aria-hidden>→</span>
          </span>
        </div>
      </div>

      {/* Team key — small data dots + names; the hovered side reads brighter. */}
      <div className="mt-3 flex items-center gap-4 text-[11px] text-white/60">
        <TeamKey
          color={HOME_COLOR}
          name={homeTeam}
          crestUrl={homeCrestUrl}
          active={hovered?.team === 'home'}
          dim={hovered != null && hovered.team !== 'home'}
        />
        <TeamKey
          color={AWAY_COLOR}
          name={awayTeam}
          crestUrl={awayCrestUrl}
          active={hovered?.team === 'away'}
          dim={hovered != null && hovered.team !== 'away'}
        />
        {hovered?.isGoalkeeper && <span className="tabular-nums text-white/70">GK</span>}
      </div>

      <PanelFooter provider="statsbomb" />
    </figure>
  );
}

/** Small data key: a colour dot + the team name; brightens for the hovered side. */
function TeamKey({
  color,
  name,
  crestUrl,
  active,
  dim,
}: {
  color: string;
  name: string;
  crestUrl?: string;
  active: boolean;
  dim: boolean;
}) {
  return (
    <span
      className={cn(
        'flex items-center gap-1.5 transition-colors',
        active ? 'text-white/90' : dim ? 'text-white/35' : 'text-white/90'
      )}
    >
      <span
        className="inline-block size-2 rounded-full transition-opacity"
        style={{ backgroundColor: color, opacity: dim ? 0.45 : 1 }}
      />
      {crestUrl && (
        <img
          src={crestUrl}
          alt=""
          aria-hidden
          width={16}
          height={16}
          className="inline-block size-4 shrink-0 rounded object-contain align-middle transition-opacity"
          style={{ opacity: dim ? 0.45 : 1 }}
        />
      )}
      <span className="truncate">{name}</span>
    </span>
  );
}

/**
 * A small name label above the hovered player dot. Lives in the dots' SVG
 * (0..100 user space); flips below the dot near the top edge and clamps to the
 * pitch so it never spills off the frame.
 */
function HoverLabel({
  cx,
  cy,
  label,
  color,
}: {
  cx: number;
  cy: number;
  label: string;
  color: string;
}) {
  const w = Math.max(13, label.length * 1.5 + 5);
  const h = 5.6;
  const gap = 2.6;
  const bx = Math.max(1, Math.min(100 - w - 1, cx - w / 2));
  const by = cy > 14 ? cy - h - gap : cy + gap + 1.5;
  return (
    <motion.g
      initial={{ opacity: 0, y: 1 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      style={{ pointerEvents: 'none' }}
    >
      <rect
        x={bx}
        y={by}
        width={w}
        height={h}
        rx={1.2}
        fill="#0a0a0a"
        fillOpacity={0.92}
        stroke={color}
        strokeOpacity={0.55}
        strokeWidth={0.3}
      />
      <rect x={bx} y={by} width={0.9} height={h} rx={0.4} fill={color} />
      <text
        x={bx + w / 2 + 0.45}
        y={by + h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={2.8}
        fontWeight="bold"
        fill="white"
      >
        {label}
      </text>
    </motion.g>
  );
}

/**
 * Sweep the grid once: for every cell, accumulate each side's 1/d² influence,
 * decide the owner and the control margin, and tally area share. Pure + cheap
 * (GRID_W × GRID_H × players), so it runs in a `useMemo`.
 */
function computeControl(players: ResolvedPlayer[]): {
  owner: Int8Array;
  margin: Float32Array;
  share: { home: number; away: number };
} {
  const cells = GRID_W * GRID_H;
  const owner = new Int8Array(cells); // 1 = home, -1 = away, 0 = none
  const margin = new Float32Array(cells); // 0..1 dominance of the owner

  if (players.length === 0) {
    return { owner, margin, share: { home: 0.5, away: 0.5 } };
  }

  let homeCells = 0;
  let ownedCells = 0;

  for (let cy = 0; cy < GRID_H; cy++) {
    for (let cx = 0; cx < GRID_W; cx++) {
      // Sample at the cell centre.
      const px = cx + 0.5;
      const py = cy + 0.5;
      let homeInf = 0;
      let awayInf = 0;

      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        if (!p) continue;
        const dx = px - p.gx;
        const dy = py - p.gy;
        const dSq = Math.max(dx * dx + dy * dy, MIN_DIST_SQ);
        const inf = 1 / dSq;
        if (p.team === 'home') homeInf += inf;
        else awayInf += inf;
      }

      const idx = cy * GRID_W + cx;
      const total = homeInf + awayInf;
      if (total <= 0) {
        owner[idx] = 0;
        margin[idx] = 0;
        continue;
      }

      // Margin: how lopsided this cell is (0 = even, 1 = total control).
      const diff = Math.abs(homeInf - awayInf) / total;
      if (homeInf >= awayInf) {
        owner[idx] = 1;
        homeCells++;
      } else {
        owner[idx] = -1;
      }
      margin[idx] = diff;
      ownedCells++;
    }
  }

  const share = ownedCells > 0 ? homeCells / ownedCells : 0.5;
  return { owner, margin, share: { home: share, away: 1 - share } };
}

interface ControlCanvasProps {
  players: ResolvedPlayer[];
  /** Currently hovered player id — blooms their owned region. */
  hoveredId: string | null;
}

/**
 * Paints the control surface. The grid is rendered at native cell resolution
 * onto a tiny offscreen canvas, then blitted up to the DPR-scaled display
 * canvas with image smoothing on — that up-scale *is* the soft falloff, so no
 * separate blur pass is needed. Fades in on mount; re-tints with a calm cross
 * fade when the hovered player changes (their cells brighten, others settle).
 */
function ControlCanvas({ players, hoveredId }: ControlCanvasProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState(0);

  // Per-cell owner/margin only depend on positions, not hover.
  const field = useMemo(() => computeControl(players), [players]);

  // For hover emphasis: which cells does the hovered player dominate? A cell is
  // "theirs" if they are the single nearest player on the owning side.
  const hoveredOwnedCells = useMemo(() => {
    if (!hoveredId) return null;
    const target = players.find((p) => p.id === hoveredId);
    if (!target) return null;
    const owned = new Uint8Array(GRID_W * GRID_H);
    for (let cy = 0; cy < GRID_H; cy++) {
      for (let cx = 0; cx < GRID_W; cx++) {
        const px = cx + 0.5;
        const py = cy + 0.5;
        let bestSame = Infinity;
        let bestTargetDist = Infinity;
        for (let i = 0; i < players.length; i++) {
          const p = players[i];
          if (!p || p.team !== target.team) continue;
          const dx = px - p.gx;
          const dy = py - p.gy;
          const dSq = dx * dx + dy * dy;
          if (p.id === target.id) bestTargetDist = dSq;
          if (dSq < bestSame) bestSame = dSq;
        }
        // The target is the closest team-mate to this cell.
        if (bestTargetDist <= bestSame) owned[cy * GRID_W + cx] = 1;
      }
    }
    return owned;
  }, [players, hoveredId]);

  // Track the (square) container edge so the backing store matches it.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => setSize(el.clientWidth);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // (Re)paint whenever the field, hover state, or measured size changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    if (players.length === 0) return;

    // Render the grid into a tiny offscreen buffer (1px per cell), then scale
    // it up with smoothing for a soft gradient wash.
    const off = document.createElement('canvas');
    off.width = GRID_W;
    off.height = GRID_H;
    const octx = off.getContext('2d');
    if (!octx) return;
    const img = octx.createImageData(GRID_W, GRID_H);

    const home = hexToRgb(HOME_COLOR);
    const away = hexToRgb(AWAY_COLOR);
    const { owner, margin } = field;

    for (let idx = 0; idx < GRID_W * GRID_H; idx++) {
      const own = owner[idx] ?? 0;
      if (own === 0) continue;
      const m = margin[idx] ?? 0;
      const isHome = own === 1;
      const c = isHome ? home : away;

      // Calm wash: a low ceiling, biased by how decisively the cell is held.
      // A near-even cell (small margin) stays close to transparent.
      let alpha = 0.06 + m * 0.26;

      // Hover emphasis: the hovered player's own cells bloom; everything else
      // settles toward a fainter base.
      if (hoveredOwnedCells) {
        alpha = hoveredOwnedCells[idx] ? Math.min(0.62, alpha + 0.3) : alpha * 0.45;
      }

      const o = idx * 4;
      img.data[o] = c.r;
      img.data[o + 1] = c.g;
      img.data[o + 2] = c.b;
      img.data[o + 3] = Math.round(alpha * 255);
    }

    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, 0, 0, size, size);
  }, [field, hoveredOwnedCells, players.length, size]);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0">
      <motion.canvas
        ref={canvasRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 h-full w-full"
        style={{ mixBlendMode: 'screen' }}
      />
    </div>
  );
}

/** Parse a `#rgb`/`#rrggbb` hex string into 0–255 channels (falls back to red). */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const n = Number.parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return { r: 235, g: 0, b: 0 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
