import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';

/** A single on-ball touch in StatsBomb pitch coordinates (120 × 80). */
export interface HeatMapTouch {
  /** StatsBomb x (0 = own goal line, 120 = opposition goal line). */
  x: number;
  /** StatsBomb y (0 = left touchline, 80 = right touchline). */
  y: number;
  /** Owning player id — must match a {@link HeatMapPlayer.id} to be filterable. */
  player?: string;
}

/** A named player available in the segmented filter. */
export interface HeatMapPlayer {
  /** Stable id, referenced by {@link HeatMapTouch.player}. */
  id: string;
  /** Display name shown in the filter chip. */
  name: string;
}

export interface HeatMapProps {
  /** Team display name — the masthead title. */
  team: string;
  /** Bloom accent colour. Defaults to the BTL home red. */
  color?: string;
  /** Every touch to plot, in StatsBomb 120 × 80 coordinates. */
  touches: HeatMapTouch[];
  /** Named players for the segmented filter. Omit for an unfiltered cloud. */
  players?: HeatMapPlayer[];
  /** Additional CSS classes on the outer plate. */
  className?: string;
}

/** StatsBomb pitch dimensions. */
const SB_LENGTH = 120;
const SB_WIDTH = 80;

/** Soft-blob radius as a fraction of the canvas's shorter edge. */
const BLOB_RADIUS_RATIO = 0.085;

/**
 * Territory heat map — a restrained density "bloom" of a team's touches on the
 * dark BTL pitch. Touches are accumulated as additive soft radial gradients on
 * a `<canvas>` layered over the {@link Pitch} primitive, colour-mapped from
 * transparent to the team colour. A segmented filter (All + each named player)
 * re-blooms the cloud with a calm cross-fade.
 *
 * Editorial, not meteorological: a single accent colour, low ceiling opacity,
 * and a soft additive build — premium infographic, not a weather map.
 */
export function HeatMap({ team, color = '#eb0000', touches, players, className }: HeatMapProps) {
  // `null` = the "All" segment; otherwise a player id.
  const [activePlayer, setActivePlayer] = useState<string | null>(null);
  const titleId = useId();

  const segments = useMemo<{ id: string | null; label: string }[]>(
    () => [
      { id: null, label: 'All' },
      ...(players ?? []).map((p) => ({ id: p.id, label: p.name })),
    ],
    [players]
  );

  const visibleTouches = useMemo(() => {
    if (activePlayer === null) return touches;
    return touches.filter((t) => t.player === activePlayer);
  }, [touches, activePlayer]);

  return (
    <figure
      aria-labelledby={titleId}
      className={cn(
        'relative isolate w-full max-w-[560px] overflow-hidden rounded-[14px] border border-white/[0.08]',
        'bg-gradient-to-b from-white/[0.045] to-white/[0.012] p-5',
        'shadow-[0_30px_70px_-32px_rgba(0,0,0,0.75)]',
        className
      )}
      style={{ fontFamily: '"le-monde-journal-std", Georgia, serif' }}
    >
      {/* Faint red top hairline. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}99 18%, ${color}99 82%, transparent)`,
        }}
      />

      {/* Masthead. */}
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.2em]"
            style={{ color, fontFamily: 'inherit' }}
          >
            Territory
          </div>
          <h3 id={titleId} className="mt-1 text-[22px] leading-none text-white">
            {team}
          </h3>
        </div>
        <div className="text-right text-[10px] uppercase tracking-[0.2em] text-white/40">
          <span className="tabular-nums text-white/60">{visibleTouches.length}</span> touches
        </div>
      </header>

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
          // Key on the active segment so the canvas cross-fades on filter change.
          key={activePlayer ?? '__all__'}
        />
        {/* Attack-direction cue. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-1.5 flex justify-center">
          <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-white/30">
            Attacking <span aria-hidden>→</span>
          </span>
        </div>
      </div>

      {/* Segmented player filter. */}
      {segments.length > 1 && (
        <div
          role="tablist"
          aria-label={`Filter ${team} touches by player`}
          className="mt-4 flex flex-wrap gap-1.5"
        >
          {segments.map((seg) => {
            const isActive = seg.id === activePlayer;
            return (
              <button
                key={seg.id ?? '__all__'}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActivePlayer(seg.id)}
                className={cn(
                  'relative rounded-full px-3 py-1 text-[11px] tracking-tight transition-colors',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40',
                  isActive ? 'text-white' : 'text-white/45 hover:text-white/70'
                )}
                style={{ fontFamily: 'inherit' }}
              >
                {isActive && (
                  <motion.span
                    layoutId={`${titleId}-seg`}
                    aria-hidden
                    className="absolute inset-0 rounded-full border"
                    style={{ borderColor: `${color}66`, backgroundColor: `${color}1f` }}
                    transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                  />
                )}
                <span className="relative">{seg.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Colophon. */}
      <footer className="mt-4 border-t border-white/[0.06] pt-3 text-[9px] uppercase tracking-[0.2em] text-white/30">
        Data · StatsBomb
      </footer>
    </figure>
  );
}

interface DensityCanvasProps {
  touches: HeatMapTouch[];
  color: string;
}

/**
 * The bloom layer. Renders accumulated soft radial gradients (additive) onto a
 * DPR-scaled canvas sized to its container, then fades in on mount. Because the
 * parent keys this component on the active filter, React remounts it on each
 * filter change — `AnimatePresence` cross-fades the old cloud out as the new
 * one blooms in.
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

    const { r, g, b } = hexToRgb(color);
    const radius = Math.max(size * BLOB_RADIUS_RATIO, 6);
    // Per-touch ceiling: many overlaps build toward the colour without any
    // single touch shouting. Additive 'lighter' blending does the stacking.
    const peak = Math.min(0.16, 7 / Math.sqrt(touches.length));

    ctx.globalCompositeOperation = 'lighter';
    for (const t of touches) {
      // StatsBomb (120×80) → 0..1 → canvas px. SB y already runs left→right
      // matching the Pitch's y (0 = left touchline).
      const cx = (t.x / SB_LENGTH) * size;
      const cy = (t.y / SB_WIDTH) * size;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${peak})`);
      grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${peak * 0.4})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
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
          style={{ mixBlendMode: 'screen' }}
        />
      </AnimatePresence>
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
