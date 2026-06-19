import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import { PanelFooter } from '#/football/lib/panel-footer';
import { BLOCK_FONT_STACK } from '#/football/lib/font';

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
 * pile up only where play actually clustered. The band keeps even a busy map's
 * kernel wide enough (≥4 cells) that overlapping touches fuse into zones.
 */
const KERNEL_MIN = 4;
const KERNEL_MAX = 11;

/**
 * Ceiling alpha for the very hottest zone. The normalised field tops out here so
 * even a team's busiest area reads as a strong warm region, never a fully
 * saturated lava blob — the dark pitch and its markings stay readable beneath.
 */
const HEAT_CEILING = 0.8;

/**
 * Gamma applied to the normalised field before mapping to alpha. >1 lifts the
 * mid/low density so warm regions spread legibly rather than collapsing to a few
 * pinpoints, while the peak stays bounded by {@link HEAT_CEILING}.
 */
const HEAT_GAMMA = 0.72;

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
}: HeatMapProps) {
  // `null` = the "All" option; otherwise a player id.
  const [activePlayer, setActivePlayer] = useState<string | null>(null);
  const titleId = useId();

  const options = useMemo<{ id: string | null; label: string }[]>(
    () => [
      { id: null, label: 'All players' },
      ...(players ?? []).map((p) => ({ id: p.id, label: p.name })),
    ],
    [players]
  );

  const visibleTouches = useMemo(() => {
    if (activePlayer === null) return touches;
    return touches.filter((t) => t.player === activePlayer);
  }, [touches, activePlayer]);

  const activeLabel = options.find((o) => o.id === activePlayer)?.label ?? 'All players';

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
        {options.length > 1 && (
          <ControlDropdown label="Player" valueLabel={activeLabel}>
            {(close) =>
              options.map((o) => (
                <DropdownItem
                  key={o.id ?? '__all__'}
                  selected={o.id === activePlayer}
                  onSelect={() => {
                    setActivePlayer(o.id);
                    close();
                  }}
                >
                  {o.label}
                </DropdownItem>
              ))
            }
          </ControlDropdown>
        )}
      </div>

      {/* Pitch + density canvas overlay (square box). */}
      <div className="relative aspect-square w-full">
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
      </div>

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

// ── Share-menu-style dropdown ────────────────────────────────────────────────
// Mirrors the editor's game-block ControlDropdown look (the anchored share-menu
// trigger + glass content). Self-contained here because viz is a standalone
// AGPL package with no design-system dependency; the classes match the kit.
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
 * component on the active filter, React remounts it on each filter change —
 * `AnimatePresence` cross-fades the old cloud out as the new one blooms in.
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
    const kernel = clamp(95 / Math.sqrt(touches.length), KERNEL_MIN, KERNEL_MAX);
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
      if (norm <= 0.001) continue; // leave cold cells fully transparent
      // Gamma-lift the mids so warm regions spread, then cap at the ceiling.
      const a = Math.min(HEAT_CEILING, norm ** HEAT_GAMMA * HEAT_CEILING);
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
      <AnimatePresence>
        <motion.canvas
          ref={canvasRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 h-full w-full"
        />
      </AnimatePresence>
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
