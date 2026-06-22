import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import { PanelFooter } from '#/football/lib/panel-footer';
import { BLOCK_FONT_STACK } from '#/football/lib/font';

/** A defensive ball-hunting action, in StatsBomb pitch coordinates (120 × 80). */
export interface PressEvent {
  /** StatsBomb x (0 = own goal line, 120 = opposition goal line). */
  x: number;
  /** StatsBomb y (0 = left touchline, 80 = right touchline). */
  y: number;
  /**
   * What the action was. `pressure` = closing down a ball-carrier;
   * `recovery` = winning the loose ball back.
   */
  kind: 'pressure' | 'recovery';
}

/** Per-third pressure share — counts of pressing actions by pitch third. */
export interface PressThirds {
  /** Own third (deepest 0–40 in StatsBomb x). */
  defensive: number;
  /** Middle third (40–80). */
  middle: number;
  /** Opposition third (80–120) — where a high press hunts. */
  attacking: number;
}

export interface PressMapProps {
  /** Team display name. */
  team: string;
  /** Optional team crest URL — a small badge shown next to the team name. */
  crestUrl?: string;
  /** Bloom + accent colour. Defaults to the BTL home red. */
  color?: string;
  /**
   * Passes allowed per defensive action — the canonical pressing-intensity
   * metric. Lower means a more aggressive, higher press.
   */
  ppda: number;
  /** Every pressing action to plot, in StatsBomb 120 × 80 coordinates. */
  events: PressEvent[];
  /**
   * Pre-computed per-third pressure share. Omit to derive it from {@link events}
   * (split on the StatsBomb thirds: 0–40 / 40–80 / 80–120).
   */
  thirds?: PressThirds;
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

/** Third boundaries along StatsBomb x (0–120). */
const THIRD_DEF = SB_LENGTH / 3; // 40
const THIRD_MID = (SB_LENGTH * 2) / 3; // 80

/** Soft-blob radius as a fraction of the canvas's shorter edge. */
const BLOB_RADIUS_RATIO = 0.085;

const HOME_COLOR = '#eb0000';

/** Which actions are shown / counted. */
type PressMetric = 'all' | 'pressure' | 'recovery';

const METRIC_OPTIONS: { value: PressMetric; label: string }[] = [
  { value: 'all', label: 'All actions' },
  { value: 'pressure', label: 'Pressures' },
  { value: 'recovery', label: 'Ball recoveries' },
];

/** The three pitch thirds, ordered own-goal → opposition-goal. */
type ThirdKey = keyof PressThirds;
const THIRD_ORDER: ThirdKey[] = ['defensive', 'middle', 'attacking'];
const THIRD_LABEL: Record<ThirdKey, string> = {
  defensive: 'Defensive third',
  middle: 'Middle third',
  attacking: 'Attacking third',
};
const THIRD_SHORT: Record<ThirdKey, string> = {
  defensive: 'Def',
  middle: 'Mid',
  attacking: 'Att',
};

/** Which third a StatsBomb x falls in (own-half-first orientation). */
function thirdForX(x: number): ThirdKey {
  if (x < THIRD_DEF) return 'defensive';
  if (x < THIRD_MID) return 'middle';
  return 'attacking';
}

/** Tally pressing actions into the three thirds. */
function countThirds(events: PressEvent[]): PressThirds {
  const out: PressThirds = { defensive: 0, middle: 0, attacking: 0 };
  for (const e of events) out[thirdForX(e.x)] += 1;
  return out;
}

/**
 * PPDA → a plain-language press band. PPDA (passes the opponent is allowed per
 * defensive action) runs low-to-high: the fewer passes a side concedes before
 * engaging, the higher the press. Real single-match values sit roughly 5–10 for
 * an aggressive high press, 10–13 for a mid block, and 13+ for a side that sits
 * off — so the bands are set there (≤ 10 reads as a genuine high press, which a
 * 7–9 number should).
 */
function pressIntensity(ppda: number): string {
  if (ppda <= 10) return 'High press';
  if (ppda <= 13) return 'Mid block';
  return 'Low block';
}

/**
 * Press map — a restrained density "bloom" of where a team hunts the ball on
 * the dark BTL pitch, styled to sit quietly next to the Heat map.
 * Pressures and ball-recoveries are accumulated as additive soft radial
 * gradients on a `<canvas>` layered over the {@link Pitch} primitive and
 * colour-mapped toward the team colour, so you read *where* the press lives.
 *
 * Over the bloom sits a clean thirds breakdown (defensive / middle / attacking
 * share of pressing actions) — hovering a third highlights it and surfaces its
 * count — and a prominent, plain PPDA readout. A clean dropdown switches the
 * plotted metric between all actions, pressures only, and ball recoveries only.
 *
 * The team always presses left→right (its own goal at x = 0), so the deepest
 * third sits on the left and the attacking third — where a high press bites —
 * sits on the right, reading correctly for a fixed viewer.
 */
export function PressMap({
  team,
  crestUrl,
  color = HOME_COLOR,
  ppda,
  events,
  thirds: thirdsProp,
  className,
  wordmark,
  builderControls,
}: PressMapProps) {
  const [metric, setMetric] = useState<PressMetric>('all');
  const [hoverThird, setHoverThird] = useState<ThirdKey | null>(null);
  const titleId = useId();

  const shown = useMemo(
    () => (metric === 'all' ? events : events.filter((e) => e.kind === metric)),
    [events, metric]
  );

  // Thirds reflect the *shown* metric. A caller-supplied breakdown wins, but
  // only describes the full set, so it's used solely for the unfiltered view.
  const thirds = useMemo<PressThirds>(
    () => (metric === 'all' && thirdsProp ? thirdsProp : countThirds(shown)),
    [metric, thirdsProp, shown]
  );

  const thirdsTotal = thirds.defensive + thirds.middle + thirds.attacking;
  const shareOf = (key: ThirdKey) => (thirdsTotal > 0 ? thirds[key] / thirdsTotal : 0);

  const metricLabel =
    METRIC_OPTIONS.find((o) => o.value === metric)?.label ?? METRIC_OPTIONS[0]!.label;

  // PPDA framing — a calm three-band scale so the readout reads without a chart.
  const intensity = pressIntensity(ppda);

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
      {/* Header: one plain title + clean metric dropdown. */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span id={titleId} className="text-[13px] font-semibold tracking-tight text-white">
          Press map
        </span>
        <ControlDropdown label="Showing" valueLabel={metricLabel}>
          {(close) =>
            METRIC_OPTIONS.map((o) => (
              <DropdownItem
                key={o.value}
                selected={o.value === metric}
                onSelect={() => {
                  setMetric(o.value);
                  close();
                }}
              >
                {o.label}
              </DropdownItem>
            ))
          }
        </ControlDropdown>
      </div>

      {/* PPDA readout — prominent but plain. */}
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-[34px] font-semibold leading-none tabular-nums text-white">
            {ppda.toFixed(1)}
          </span>
          <span className="text-[12px] font-medium text-white/45">PPDA</span>
        </div>
        <div className="text-right">
          <span className="text-[12px] font-semibold" style={{ color }}>
            {intensity}
          </span>
        </div>
      </div>

      {/* Pitch + density canvas + interactive thirds overlay (square box). */}
      <div className="relative aspect-square w-full overflow-hidden rounded-[8px]">
        <Pitch
          variant="full"
          theme="dark"
          className="absolute inset-0 !aspect-square h-full w-full"
        />
        <DensityCanvas
          events={shown}
          color={color}
          // Key on the active metric so the canvas cross-fades on change.
          key={metric}
        />
        <ThirdsOverlay
          thirds={thirds}
          shareOf={shareOf}
          color={color}
          hover={hoverThird}
          onHover={setHoverThird}
        />
      </div>

      {/* Legend: what the bloom means + which way the side attacks. Anchors the
          encoding so the density ramp and left→right orientation read at a glance. */}
      <DensityLegend color={color} metric={metric} />

      {/* Thirds breakdown — share bar + per-third counts; hover-linked to pitch. */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {THIRD_ORDER.map((key) => {
          const active = hoverThird === key;
          const share = shareOf(key);
          return (
            <button
              key={key}
              type="button"
              aria-label={`${THIRD_LABEL[key]}: ${thirds[key]} actions, ${Math.round(share * 100)}%`}
              onMouseEnter={() => setHoverThird(key)}
              onMouseLeave={() => setHoverThird(null)}
              onFocus={() => setHoverThird(key)}
              onBlur={() => setHoverThird(null)}
              className="group flex flex-col gap-1 rounded-[6px] p-1.5 text-left transition-colors hover:bg-white/[0.04] focus:bg-white/[0.04] focus:outline-none"
            >
              <span className="flex items-baseline justify-between gap-1">
                <span
                  className={cn(
                    'text-[10px] font-medium transition-colors',
                    active ? 'text-white/80' : 'text-white/45 group-hover:text-white/70'
                  )}
                >
                  {THIRD_SHORT[key]}
                </span>
                <span className="text-[10px] tabular-nums text-white/35">
                  {Math.round(share * 100)}%
                </span>
              </span>
              {/* Share track + fill. */}
              <span className="relative h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ backgroundColor: color }}
                  initial={false}
                  animate={{ width: `${share * 100}%`, opacity: active ? 1 : 0.6 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              <span className="text-[13px] font-semibold tabular-nums text-white">
                {thirds[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer: team + a small plain action count. */}
      <div className="mt-3 flex items-center justify-between gap-4 text-[11px] text-white/90">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
          {crestUrl && (
            <img
              src={crestUrl}
              alt=""
              aria-hidden
              className="size-4 shrink-0 rounded object-contain"
            />
          )}
          <span className="truncate text-white/70">{team}</span>
        </span>
        <span>
          <span className="tabular-nums text-white/80">{shown.length}</span>{' '}
          {metric === 'recovery' ? 'recoveries' : metric === 'pressure' ? 'pressures' : 'actions'}
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
  'absolute right-0 top-[calc(100%+6px)] z-50 flex min-w-[160px] flex-col gap-0.5 rounded-[8px] border border-white/10 bg-[#161616]/95 p-1 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl';

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

/**
 * Compact legend under the pitch. The left half decodes the bloom — a faint→solid
 * team-colour ramp labelled Low / High so the reader knows brighter = more
 * pressing actions clustered there. The right half states the fixed attacking
 * direction (the side presses toward the opposition goal on the right), which is
 * what makes the thirds and bloom read correctly for a still viewer. When the
 * unfiltered "all actions" view is shown, a line notes that recoveries render as
 * the tighter, brighter cores within the broader pressure haze.
 */
function DensityLegend({ color, metric }: { color: string; metric: PressMetric }) {
  const { r, g, b } = hexToRgb(color);
  return (
    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[10px] text-white/45">
      <span className="flex items-center gap-1.5">
        <span className="text-white/35">Press density</span>
        <span
          aria-hidden
          className="h-1.5 w-16 rounded-full"
          style={{
            background: `linear-gradient(to right, rgba(${r},${g},${b},0.06), rgba(${r},${g},${b},0.9))`,
          }}
        />
        <span className="flex w-16 justify-between text-white/35">
          <span>Low</span>
          <span>High</span>
        </span>
      </span>
      <span className="flex items-center gap-1.5 text-white/35">
        <span>Attacking</span>
        <svg width="22" height="8" viewBox="0 0 22 8" fill="none" aria-hidden>
          <path
            d="M1 4h18m0 0l-4-3m4 3l-4 3"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {metric === 'all' && (
        <span className="basis-full text-white/30">
          Recoveries show as the tighter, brighter cores within the pressure haze.
        </span>
      )}
    </div>
  );
}

interface ThirdsOverlayProps {
  thirds: PressThirds;
  shareOf: (key: ThirdKey) => number;
  color: string;
  hover: ThirdKey | null;
  onHover: (key: ThirdKey | null) => void;
}

/**
 * The thirds layer over the pitch: three equal vertical zones with hairline
 * dividers. Hovering a zone lifts a faint team-colour wash and floats that
 * third's label + count, so the breakdown bar below and the pitch stay linked.
 * Plain HTML (not SVG) so the hit-targets and label type sit crisply on top.
 */
function ThirdsOverlay({ thirds, shareOf, color, hover, onHover }: ThirdsOverlayProps) {
  return (
    <div className="absolute inset-0 flex">
      {THIRD_ORDER.map((key, i) => {
        const active = hover === key;
        return (
          <div
            key={key}
            onMouseEnter={() => onHover(key)}
            onMouseLeave={() => onHover(null)}
            className={cn(
              'relative flex-1',
              // Hairline dividers between zones (skip the first left edge).
              i > 0 && 'border-l border-white/[0.07]'
            )}
          >
            {/* Hover wash — calm, team-tinted. */}
            <motion.div
              className="absolute inset-0"
              style={{ backgroundColor: color }}
              initial={false}
              animate={{ opacity: active ? 0.1 : 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
            {/* Floating count on hover. */}
            <AnimatePresence>
              {active && (
                <motion.div
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 3 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-[6px] border border-white/10 bg-[#161616]/95 px-2 py-1 text-center shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                >
                  <span className="block text-[10px] text-white/50">{THIRD_LABEL[key]}</span>
                  <span className="text-[15px] font-semibold tabular-nums text-white">
                    {thirds[key]}
                  </span>
                  <span className="ml-1 text-[10px] tabular-nums text-white/45">
                    {Math.round(shareOf(key) * 100)}%
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

interface DensityCanvasProps {
  events: PressEvent[];
  color: string;
}

/**
 * The bloom layer. Renders accumulated soft radial gradients (additive) onto a
 * DPR-scaled canvas sized to its container, then fades in on mount. Because the
 * parent keys this component on the active metric, React remounts it on each
 * metric change — `AnimatePresence` cross-fades the old cloud out as the new
 * one blooms in. Recoveries get a slightly tighter, brighter core than the
 * broader pressure haze, so a mixed plot still reads as two textures.
 */
function DensityCanvas({ events, color }: DensityCanvasProps) {
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

  // (Re)paint whenever the event set, colour, or measured size changes.
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

    if (events.length === 0) return;

    const { r, g, b } = hexToRgb(color);
    const baseRadius = Math.max(size * BLOB_RADIUS_RATIO, 6);
    // Per-action alpha, scaled DOWN as the cloud grows. Under additive
    // ('lighter') blending the hottest zone stacks ~√n overlapping blobs, so a
    // 1/√n peak holds the hottest point at a roughly constant, *un-clipped*
    // brightness whatever the match's action count — which is what keeps the
    // bloom a legible gradient (hot vs warm vs cold) instead of one saturated
    // smear. The numerator + ceiling are lifted hard from the old 0.55/0.16
    // (which left a real ~226-action match sitting at a muddy ~0.04 per blob,
    // so even the busiest zone barely glowed): a higher per-blob alpha makes the
    // pressing cores genuinely vivid and the high/low contrast pronounced, while
    // the 1/√n falloff and the ceiling still stop the densest map clipping flat.
    const peak = clamp(1.15 / Math.sqrt(Math.max(events.length, 1)), 0.05, 0.34);

    ctx.globalCompositeOperation = 'lighter';
    for (const e of events) {
      // StatsBomb (120×80) → 0..1 → canvas px. The team presses left→right, so
      // SB x maps straight across; SB y already runs left→right like the Pitch.
      const cx = (e.x / SB_LENGTH) * size;
      const cy = (e.y / SB_WIDTH) * size;
      // Recoveries are pointier + markedly hotter cores; pressures are softer and
      // wider — so a mixed plot reads as bright recovery points inside a broader,
      // cooler pressure haze (which is what the legend promises).
      const recovery = e.kind === 'recovery';
      const radius = recovery ? baseRadius * 0.72 : baseRadius;
      const core = recovery ? peak * 1.7 : peak;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${core})`);
      grad.addColorStop(recovery ? 0.4 : 0.5, `rgba(${r}, ${g}, ${b}, ${core * 0.42})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, [events, color, size]);

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

/** Clamp a number into the inclusive `[min, max]` range. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
