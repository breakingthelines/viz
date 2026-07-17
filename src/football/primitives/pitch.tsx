import { cn } from '#/lib/utils';

export type PitchVariant = 'full' | 'half' | 'attacking-third';

/**
 * Visual theme for the pitch.
 * - `grass` (default): green grass with stripe pattern — the standalone look.
 * - `dark`: near-black grass, white lines, no stripe pattern — for the BTL
 *   Match Centre photo-hero surface where the pitch sits on the dark page.
 */
export type PitchTheme = 'grass' | 'dark';

export interface PitchProps {
  /** Pitch variant to display */
  variant?: PitchVariant;
  /** Visual theme. Defaults to `grass`. */
  theme?: PitchTheme;
  /** Additional CSS classes */
  className?: string;
  /** Pitch line color. Overrides the theme default when set. */
  lineColor?: string;
  /** Pitch grass color. Overrides the theme default when set. */
  grassColor?: string;
  /**
   * Whether to show grass pattern stripes. Defaults to `true` for the `grass`
   * theme and `false` for the `dark` theme. An explicit value always wins.
   */
  showPattern?: boolean;
  /**
   * Extra viewBox margin, in pitch units, added symmetrically on all four sides
   * so children placed ON the pitch boundary — a corner-taker at the flag, a
   * player on the goal line, plus their headshot bubbles and name labels — render
   * fully inside the frame instead of being clipped by the SVG's edge. The pitch
   * markings stay at their 0–100 (or 50–100) coordinates; the viewBox simply
   * grows outward by `padding`, insetting the pitch within the rendered box and
   * leaving a quiet gutter for edge markers. Defaults to `0` (the pitch fills the
   * box edge-to-edge, the original behaviour). The marker layer also gets
   * `overflow: visible`, so anything reaching just past the padded box still
   * paints rather than being cut.
   */
  padding?: number;
  /**
   * How the pitch fills its container. `'width'` (default) is the classic
   * `w-full h-auto` behaviour — the SVG is as wide as its container and the
   * height follows from the aspect ratio; this is right whenever the
   * container's WIDTH is the binding constraint (an inline card, a portrait
   * viewport). `'height'` instead fills the container's height and derives
   * width from it (capped at the container width so it can never overflow
   * horizontally) — for a container whose HEIGHT is the binding constraint,
   * e.g. a fullscreen pitch on a landscape phone, which is wide but short.
   */
  fit?: 'width' | 'height';
  /** Children to render on the pitch (markers, arrows, etc.) */
  children?: React.ReactNode;
}

/**
 * SVG football pitch component
 *
 * Coordinate system:
 * - ViewBox: 0 0 100 100 (full pitch) or 0 0 50 100 (half)
 * - x: 0 = own goal line, 100 = opposition goal line
 * - y: 0 = left touchline, 100 = right touchline
 */
export function Pitch({
  variant = 'full',
  theme = 'grass',
  className,
  lineColor,
  grassColor,
  showPattern,
  padding = 0,
  fit = 'width',
  children,
}: PitchProps) {
  const isDark = theme === 'dark';
  // Theme defaults, each overridable by an explicit prop.
  const resolvedGrass =
    grassColor ?? (isDark ? 'var(--color-pitch-grass-dark)' : 'var(--color-pitch-grass)');
  const resolvedLines =
    lineColor ?? (isDark ? 'var(--color-pitch-lines-dark)' : 'var(--color-pitch-lines)');
  const resolvedShowPattern = showPattern ?? !isDark;

  // The pitch markings span this box in pitch units (full vs half/third). The
  // padded viewBox grows outward from it by `padding` on every side, so edge
  // markers get a gutter to render into instead of being clipped at the frame.
  const base = (() => {
    switch (variant) {
      case 'half':
        return { x: 50, y: 0, w: 50, h: 100 };
      case 'attacking-third':
        return { x: 66.67, y: 0, w: 33.33, h: 100 };
      default:
        return { x: 0, y: 0, w: 100, h: 100 };
    }
  })();
  const pad = Number.isFinite(padding) ? Math.max(0, padding) : 0;
  const viewBox = `${base.x - pad} ${base.y - pad} ${base.w + pad * 2} ${base.h + pad * 2}`;
  // The OUTER rendered box keeps the exact aspect it had before — the default
  // `aspect-[3/2]` className (or whatever a caller overrides it to, e.g. the
  // square canvas blocks' `!aspect-square`) — so padding never changes a block's
  // shape or, for the canvas-overlay blocks, its alignment with the sibling
  // canvas. Padding only GROWS the viewBox symmetrically: with the default
  // `preserveAspectRatio="xMidYMid meet"` the pitch then sits centred and
  // slightly inset, opening an even gutter on all sides for edge markers. And
  // `overflow: visible` lets a marker reaching just past the padded box still
  // paint instead of being cut at the frame.
  return (
    <svg
      viewBox={viewBox}
      className={cn(
        fit === 'height' ? 'h-full w-auto max-w-full' : 'w-full h-auto',
        'aspect-[3/2]',
        className
      )}
      style={{ overflow: 'visible' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect x="0" y="0" width="100" height="100" fill={resolvedGrass} />

      {/* Grass pattern stripes */}
      {resolvedShowPattern && (
        <g opacity="0.15">
          {[0, 20, 40, 60, 80].map((x) => (
            <rect
              key={x}
              x={x}
              y="0"
              width="10"
              height="100"
              fill="var(--color-pitch-grass-light)"
            />
          ))}
        </g>
      )}

      {/*
       * Pitch markings. The stroke width is set per-theme: the dark theme uses a
       * slightly heavier line (0.45 ≈ 1.3–1.5px at the blocks' render size) so
       * the semi-transparent white markings stay legible behind/under the
       * screen-blend data layers the blocks paint on top. `vectorEffect`
       * non-scaling-stroke is deliberately NOT used — the markings should scale
       * with the pitch so half-pitch variants keep their proportions.
       */}
      <g
        stroke={resolvedLines}
        strokeWidth={isDark ? 0.45 : 0.3}
        fill="none"
        strokeLinejoin="round"
      >
        {/* Pitch outline */}
        <rect x="0" y="0" width="100" height="100" />

        {/* Halfway line */}
        <line x1="50" y1="0" x2="50" y2="100" />

        {/* Center circle */}
        <circle cx="50" cy="50" r="9.15" />
        <circle cx="50" cy="50" r="0.6" fill={resolvedLines} stroke="none" />

        {/* Left penalty area */}
        <rect x="0" y="21.1" width="16.5" height="57.8" />
        <rect x="0" y="36.8" width="5.5" height="26.4" />
        <circle cx="11" cy="50" r="0.6" fill={resolvedLines} stroke="none" />
        <path d="M 16.5 40.1 A 9.15 9.15 0 0 1 16.5 59.9" />

        {/* Left goal */}
        <rect x="-2" y="45.2" width="2" height="9.6" strokeWidth={isDark ? 0.35 : 0.2} />

        {/* Right penalty area */}
        <rect x="83.5" y="21.1" width="16.5" height="57.8" />
        <rect x="94.5" y="36.8" width="5.5" height="26.4" />
        <circle cx="89" cy="50" r="0.6" fill={resolvedLines} stroke="none" />
        <path d="M 83.5 40.1 A 9.15 9.15 0 0 0 83.5 59.9" />

        {/* Right goal */}
        <rect x="100" y="45.2" width="2" height="9.6" strokeWidth={isDark ? 0.35 : 0.2} />

        {/* Corner arcs */}
        <path d="M 0 1 A 1 1 0 0 0 1 0" />
        <path d="M 0 99 A 1 1 0 0 1 1 100" />
        <path d="M 99 0 A 1 1 0 0 0 100 1" />
        <path d="M 99 100 A 1 1 0 0 1 100 99" />
      </g>

      {/* Children (markers, arrows, etc.) */}
      {children}
    </svg>
  );
}
