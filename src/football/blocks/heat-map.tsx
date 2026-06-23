import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import { PanelFooter } from '#/football/lib/panel-footer';
import { BLOCK_FONT_STACK } from '#/football/lib/font';
import { PlayerSelect, type SelectablePlayer } from '#/football/lib/player-select';
import { usePersistedSelection } from '#/football/lib/use-persisted-selection';
import { RevealOnScroll } from '#/football/lib/reveal-on-scroll';

/**
 * The Heat Map's full user-selectable state: which player the cloud is filtered
 * to. `null` is the "Whole team" default. Seed it via
 * {@link HeatMapProps.initialSelection} and observe every change through
 * {@link HeatMapProps.onSelectionChange}.
 */
export interface HeatMapSelection {
  /** Filtered player id, or `null` for the whole-team view. */
  activePlayer: string | null;
}

/** A single on-ball touch in StatsBomb pitch coordinates (120 × 80). */
export interface HeatMapTouch {
  /** StatsBomb x (0 = own goal line, 120 = opposition goal line). */
  x: number;
  /** StatsBomb y (0 = left touchline, 80 = right touchline). */
  y: number;
  /** Owning player id — must match a {@link HeatMapPlayer.id} to be filterable. */
  player?: string;
}

/** A named player available in the filter. */
export interface HeatMapPlayer {
  /** Stable id, referenced by {@link HeatMapTouch.player}. */
  id: string;
  /** Display name shown in the filter. */
  name: string;
  /**
   * Team display name (the selector's group heading, e.g. "Argentina"). When
   * BOTH teams' players are supplied, the selector splits them by team and the
   * default "Whole team" view shows only the panel's own `team`; the other
   * side's players stay available to drill into. Omit (the single-team case) and
   * the players render as one flat list with the default showing every touch —
   * the original behaviour.
   */
  team?: string;
}

export interface HeatMapProps {
  /** Team display name. */
  team: string;
  /** Team crest URL. Rendered as a small badge before the team name. */
  crestUrl?: string;
  /** Bloom accent colour. Defaults to the BTL home red. */
  color?: string;
  /** Every touch to plot, in StatsBomb 120 × 80 coordinates. */
  touches: HeatMapTouch[];
  /** Named players for the filter dropdown. Omit for an unfiltered cloud. */
  players?: HeatMapPlayer[];
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
   * When omitted, the block opens on the default whole-team view — exactly as
   * before. Read once on mount; later changes don't re-seed.
   */
  initialSelection?: HeatMapSelection;
  /**
   * Fires whenever the user changes the selection, with the full new selection
   * object. When omitted, no-op (today's behaviour).
   */
  onSelectionChange?: (selection: HeatMapSelection) => void;
}

/** StatsBomb pitch dimensions. */
const SB_LENGTH = 120;
const SB_WIDTH = 80;

/**
 * Density-field resolution. Touches are binned into a `DENSITY_W × DENSITY_H`
 * scalar field which is normalised and then up-scaled with smoothing for a soft
 * gradient — the same soft-falloff trick the pitch-control surface uses. Kept
 * deliberately coarse so the bilinear up-scale blends neighbouring cells into
 * smooth zones rather than per-touch speckle.
 */
const DENSITY_W = 60;
const DENSITY_H = 40;

/**
 * Per-touch kernel radius in GRID cells. It scales DOWN with touch count so a
 * dense team map concentrates into hot zones instead of smearing into a flood:
 * few touches → a broad, soft bloom; many touches → tighter contributions that
 * pile up only where play actually clustered. Tightened (smaller constant +
 * lower ceiling) versus the old 4–11 band, which over a 300-touch map fused
 * everything into one uniform dark-red wash — the kernels overlapped so heavily
 * that no zone stood out. A tighter kernel keeps the cores separable so the busy
 * areas read as distinct hot zones over mostly-dark grass.
 */
const KERNEL_MIN = 2.4;
const KERNEL_MAX = 7;

/**
 * Ceiling alpha for the very hottest zone. The normalised field tops out here so
 * a team's busiest area reads as a vivid, saturated core while the dark pitch and
 * its markings still show through everywhere the field is cool. Lifted from 0.8
 * so the hottest zones genuinely punch rather than sitting at a muted maroon.
 */
const HEAT_CEILING = 0.94;

/**
 * Contrast gamma applied to the normalised field before mapping to alpha. >1
 * SUPPRESSES the low/mid density and lets only genuine clusters climb toward the
 * ceiling — the opposite of the old 0.72 (which lifted the mids and flattened
 * the whole pitch into a wash). This is what turns the field into discrete hot
 * zones instead of a uniform gradient.
 */
const HEAT_GAMMA = 1.55;

/**
 * Floor below which a normalised cell is left fully transparent. A small dead
 * zone keeps the cold majority of the pitch dark (so zones read against grass)
 * rather than tinting the entire field a faint red.
 */
const HEAT_FLOOR = 0.06;

/**
 * Heat map — a restrained density "bloom" of a team's touches on the
 * dark BTL pitch, styled to sit quietly next to the Shot map. Touches are
 * accumulated as additive soft radial gradients on a `<canvas>` layered over
 * the {@link Pitch} primitive, colour-mapped from transparent to the team
 * colour. A clean player filter (All + each named player) re-blooms the cloud
 * with a calm cross-fade.
 *
 * Editorial, not meteorological: a single accent colour, low ceiling opacity,
 * and a soft additive build — premium infographic, not a weather map.
 */
export function HeatMap({
  team,
  crestUrl,
  color = '#eb0000',
  touches,
  players,
  className,
  wordmark,
  builderControls,
  initialSelection,
  onSelectionChange,
}: HeatMapProps) {
  // Consolidated selection (seeded by the host, emits every change). `null` =
  // the "Whole team" option; otherwise a player id.
  const [selection, setSelection] = usePersistedSelection<HeatMapSelection>(
    initialSelection,
    { activePlayer: null },
    onSelectionChange
  );
  const { activePlayer } = selection;
  const setActivePlayer = (id: string | null) => setSelection({ activePlayer: id });
  const titleId = useId();

  const allPlayers = players ?? [];

  // The selector splits players by team when both sides are supplied. When no
  // player carries a team, `team` is undefined throughout and the control falls
  // back to one flat list (the original single-team behaviour).
  const selectablePlayers = useMemo<SelectablePlayer[]>(
    () => allPlayers.map((p) => ({ id: p.id, name: p.name, team: p.team })),
    [allPlayers]
  );

  // Ids belonging to THIS panel's team (matched on the team display name). Used
  // for the whole-team default so it shows only the home side's territory even
  // when the away players are present for drill-down.
  const homePlayerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of allPlayers) if (p.team === team) ids.add(p.id);
    return ids;
  }, [allPlayers, team]);

  // True only when players are split across teams (so a whole-team default must
  // scope to the home side). With a single team — or untagged legacy data — the
  // default keeps showing every touch, exactly as before.
  const hasTeamSplit = useMemo(
    () => new Set(allPlayers.map((p) => p.team).filter(Boolean)).size > 1,
    [allPlayers]
  );

  const visibleTouches = useMemo(() => {
    if (activePlayer !== null) return touches.filter((t) => t.player === activePlayer);
    // Whole-team view: scope to the home side when both teams are present, else
    // every touch (single-team / legacy data).
    if (!hasTeamSplit) return touches;
    return touches.filter((t) => t.player !== undefined && homePlayerIds.has(t.player));
  }, [touches, activePlayer, hasTeamSplit, homePlayerIds]);

  return (
    <figure
      aria-labelledby={titleId}
      // Inter-first sans (product decision): opt out of the host page's
      // editorial serif so all block text/labels/ticks render in Inter.
      style={{ fontFamily: BLOCK_FONT_STACK }}
      className={cn(
        'my-6 rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4',
        'shadow-[0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-[12px] [border-top-color:rgba(255,255,255,0.10)]',
        className
      )}
    >
      {/* Header: one plain title + clean player-filter dropdown. */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span id={titleId} className="text-[13px] font-semibold tracking-tight text-white">
          Heat Map
        </span>
        {selectablePlayers.length > 0 && (
          <PlayerSelect
            players={selectablePlayers}
            selectedId={activePlayer}
            onSelect={setActivePlayer}
          />
        )}
      </div>

      {/* Pitch + density canvas overlay (square box). RevealOnScroll plays the
          entrance on scroll-in (pure enhancement — the bloom is always visible
          regardless; its canvas keeps its own `initial={false}`). */}
      <RevealOnScroll className="relative aspect-square w-full">
        <Pitch
          variant="full"
          theme="dark"
          className="absolute inset-0 !aspect-square h-full w-full"
        />
        <DensityCanvas
          touches={visibleTouches}
          color={color}
          // Key on the active filter so the canvas cross-fades on change.
          key={activePlayer ?? '__all__'}
        />
      </RevealOnScroll>

      {/* Intensity legend — decodes the faint→vivid ramp so the reader knows
          brighter = more touches clustered there. */}
      <IntensityLegend color={color} />

      {/* Footer: team + a small plain touch count. */}
      <div className="mt-3 flex items-center justify-between gap-4 text-[11px] text-white/90">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
          <Crest url={crestUrl} name={team} />
          <span className="truncate text-white/70">{team}</span>
        </span>
        <span>
          <span className="tabular-nums text-white/80">{visibleTouches.length}</span> touches
        </span>
      </div>

      <PanelFooter provider="statsbomb" wordmark={wordmark} builderControls={builderControls} />
    </figure>
  );
}

/**
 * Compact density legend under the pitch. A faint→vivid team-colour ramp
 * labelled Low / High, built from the SAME ceiling + gamma the canvas uses so
 * the swatch reads as the real encoding (more touches clustered → hotter).
 */
function IntensityLegend({ color }: { color: string }) {
  const { r, g, b } = hexToRgb(color);
  // A handful of stops along the contrast ramp → a representative gradient.
  const stops = [0, 0.25, 0.5, 0.75, 1]
    .map((t) => {
      const a = Math.min(HEAT_CEILING, t ** HEAT_GAMMA * HEAT_CEILING);
      return `rgba(${r},${g},${b},${a.toFixed(3)}) ${Math.round(t * 100)}%`;
    })
    .join(', ');
  return (
    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-white/45">
      <span className="text-white/35">Touch density</span>
      <span
        aria-hidden
        className="h-1.5 w-16 rounded-full ring-1 ring-inset ring-white/10"
        style={{ background: `linear-gradient(to right, ${stops})` }}
      />
      <span className="flex w-16 justify-between text-white/35">
        <span>Low</span>
        <span>High</span>
      </span>
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

interface DensityCanvasProps {
  touches: HeatMapTouch[];
  color: string;
}

/**
 * The bloom layer. Builds a normalised scalar DENSITY FIELD from the touches,
 * then maps it through a transparent→colour ramp and up-scales it with smoothing
 * for a soft gradient — so the result reads as positional HOT ZONES over a
 * mostly-dark pitch, not a saturated flood. Because the parent keys this
 * component on the active filter, React remounts it on each filter change — and
 * the new cloud renders opaque immediately (no entrance gate), so a dropped
 * mount animation can never leave the map blank after a filter switch.
 *
 * Why a field (not additive blobs painted straight to the canvas): additive
 * `lighter` painting has no ceiling — more touches just pile up to solid colour.
 * Accumulating into a grid lets us NORMALISE by the field's own peak and cap the
 * hottest cell, so a 300-touch team map and a 30-touch player map both read as
 * graded zones rather than one flooding and the other vanishing. The field is
 * composited normally (no `screen` blend) so the dark grass stays dark.
 */
function DensityCanvas({ touches, color }: DensityCanvasProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState(0);

  // Track the (square) container edge so the canvas backing store matches it.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => setSize(el.clientWidth);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // (Re)paint whenever the touch set, colour, or measured size changes.
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

    if (touches.length === 0) return;

    // ── 1. Accumulate a scalar density field ──────────────────────────────
    // Kernel radius shrinks as the touch set grows: dense maps concentrate into
    // zones instead of smearing. A radial (1 - (d/R)²)² falloff per touch.
    const field = new Float32Array(DENSITY_W * DENSITY_H);
    // Count-aware kernel: broad for a sparse player map, tighter for a dense
    // team map (but never so tight that touches stop fusing — see KERNEL_MIN).
    const kernel = clamp(58 / Math.sqrt(touches.length), KERNEL_MIN, KERNEL_MAX);
    const kr = Math.ceil(kernel);
    const krSq = kernel * kernel;

    for (const t of touches) {
      // StatsBomb (120×80) → grid cell. SB y already runs left→right matching
      // the Pitch's y (0 = left touchline).
      const gx = (t.x / SB_LENGTH) * DENSITY_W;
      const gy = (t.y / SB_WIDTH) * DENSITY_H;
      const x0 = Math.max(0, Math.floor(gx - kr));
      const x1 = Math.min(DENSITY_W - 1, Math.ceil(gx + kr));
      const y0 = Math.max(0, Math.floor(gy - kr));
      const y1 = Math.min(DENSITY_H - 1, Math.ceil(gy + kr));
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          const dx = cx + 0.5 - gx;
          const dy = cy + 0.5 - gy;
          const dSq = dx * dx + dy * dy;
          if (dSq >= krSq) continue;
          // Smooth bump: (1 - (d/R)²)² — 1 at the centre, 0 at the edge.
          const f = 1 - dSq / krSq;
          field[cy * DENSITY_W + cx] += f * f;
        }
      }
    }

    // ── 2. Normalise by the field's peak ──────────────────────────────────
    let peak = 0;
    for (let i = 0; i < field.length; i++) {
      if (field[i]! > peak) peak = field[i]!;
    }
    if (peak <= 0) return;

    // ── 3. Map the normalised field → transparent→colour ramp ─────────────
    const { r, g, b } = hexToRgb(color);
    const off = document.createElement('canvas');
    off.width = DENSITY_W;
    off.height = DENSITY_H;
    const octx = off.getContext('2d');
    if (!octx) return;
    const img = octx.createImageData(DENSITY_W, DENSITY_H);

    for (let i = 0; i < field.length; i++) {
      const norm = field[i]! / peak; // 0..1
      if (norm <= HEAT_FLOOR) continue; // keep the cold majority of the pitch dark
      // Rescale above the floor so the ramp uses its full range, push through the
      // contrast gamma (suppresses lows, keeps clusters), then cap at the ceiling.
      const t = (norm - HEAT_FLOOR) / (1 - HEAT_FLOOR);
      const a = Math.min(HEAT_CEILING, t ** HEAT_GAMMA * HEAT_CEILING);
      const o = i * 4;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = Math.round(a * 255);
    }

    octx.putImageData(img, 0, 0);
    // Up-scale the tiny field with smoothing — that interpolation IS the soft
    // gradient falloff, no separate blur pass needed. Normal compositing keeps
    // the dark pitch dark where there is no heat.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, 0, 0, size, size);
  }, [touches, color, size]);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0">
      {/* `initial={false}`: the heat canvas IS the whole visualisation, so its
          visibility must never hinge on an entrance tick — a dropped mount/
          hydration animation previously left the entire block blank. It renders
          opaque on first paint; the fade is enhancement only. */}
      <motion.canvas
        ref={canvasRef}
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}

/** Clamp `n` into the inclusive `[lo, hi]` band. */
function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
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
