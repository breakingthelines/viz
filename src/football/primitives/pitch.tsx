import { cn } from '#/lib/utils';

export type PitchVariant = 'full' | 'half' | 'attacking-third';

/**
 * Visual theme for the pitch.
 * - `grass` (default): green grass with stripe pattern — the standalone look.
 * - `dark`: near-black grass, white lines, no stripe pattern — for the BTL
 *   Match Centre photo-hero surface where the pitch sits on the dark page.
 */
export type PitchTheme = 'grass' | 'dark';

/**
 * Pitch orientation — which screen axis play runs along.
 * - `landscape` (default): the normalized coordinate space (see below) is
 *   rendered as-is — own goal on the LEFT, opposition goal on the RIGHT,
 *   attacking left → right. This is the identity mapping, so every existing
 *   consumer renders pixel-identically to before this prop existed.
 * - `portrait`: the pitch is rendered a quarter-turn from that space — own
 *   goal at the BOTTOM, opposition goal at the TOP, attacking UP the screen,
 *   touchlines as the left/right screen edges — for a lineup that needs to
 *   fill a phone-shaped viewport. The underlying 0–100 data space is
 *   unchanged (own goal is still authored at `x=0`); only where that space
 *   lands on screen changes. See {@link toScreen}.
 */
export type PitchOrientation = 'landscape' | 'portrait';

/**
 * Map a point in the pitch's normalized coordinate space — `x`: 0 (own goal
 * line) → 100 (opposition goal line); `y`: 0 (left touchline) → 100 (right
 * touchline) — to the SVG's screen/drawing space for the given
 * `orientation`.
 *
 * `landscape` is the identity: normalized space already IS screen space,
 * which is what makes it the safe, zero-regression default.
 *
 * `portrait` applies a quarter-turn, `{ x: y, y: 100 - x }`. That's a proper
 * rotation, not a mirror (its linear part has determinant +1) — so it keeps
 * left/right SENSE fixed (a `y=0` touchline marker renders on the
 * screen-left edge in both orientations, rather than flipping) and never
 * needs an arc's `sweepFlag` to invert (see {@link arcPath}). The own goal
 * (`x=0`) lands at the BOTTOM (`screenY=100`); the opposition goal (`x=100`)
 * lands at the TOP (`screenY=0`) — attacking up the screen.
 *
 * This is the one place orientation math lives, and deliberately a
 * coordinate remap rather than an SVG `transform`: a wrapping
 * `<g transform="rotate(90)">` would rotate CONTENT too (text, headshot
 * photos), which portrait must not do. `Pitch` uses it (via
 * {@link screenRect} / {@link arcPath} below) to lay out every marking as a
 * transformed position with UNROTATED local geometry. Composition callers
 * (`LineupPitch`, `FormationBoard`) reuse this exact function to transpose
 * marker POSITIONS the same way, leaving marker CONTENT (numbers, names,
 * headshots) upright — see {@link fromScreen} for the inverse they need for
 * pointer/drag gestures.
 */
export function toScreen(
  x: number,
  y: number,
  orientation: PitchOrientation = 'landscape'
): { x: number; y: number } {
  if (orientation === 'portrait') return { x: y, y: 100 - x };
  return { x, y };
}

/**
 * Inverse of {@link toScreen} — map a screen-space point back to the pitch's
 * normalized coordinate space. Used only where a caller reads a position OFF
 * the screen (e.g. a pointer/drag gesture resolved via `getScreenCTM()`) and
 * needs it back in the same `x`/`y` space slot/position data is authored in,
 * so the rest of a gesture's math (hit-testing against known positions,
 * accumulating a drag offset) can stay written purely in normalized space —
 * see `LineupPitch`'s drag-to-swap.
 */
export function fromScreen(
  x: number,
  y: number,
  orientation: PitchOrientation = 'landscape'
): { x: number; y: number } {
  if (orientation === 'portrait') return { x: 100 - y, y: x };
  return { x, y };
}

/**
 * Map an axis-aligned rectangle authored in normalized pitch space to its
 * axis-aligned screen-space equivalent, via {@link toScreen} on its two
 * opposite corners. Every pitch marking drawn as an SVG `<rect>` (goal
 * areas, penalty boxes, goals, grass stripes) goes through this so a
 * landscape rect — e.g. a grass stripe running the full goal-to-goal length
 * — rotates into its portrait equivalent (a stripe running the full
 * touchline-to-touchline width, i.e. perpendicular to the new direction of
 * play) instead of needing a hand-authored second copy.
 */
function screenRect(
  x: number,
  y: number,
  width: number,
  height: number,
  orientation: PitchOrientation
): { x: number; y: number; width: number; height: number } {
  if (orientation !== 'portrait') return { x, y, width, height };
  const a = toScreen(x, y, orientation);
  const b = toScreen(x + width, y + height, orientation);
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

/**
 * Build the `d` attribute for a circular arc marking — every arc this pitch
 * draws (the two penalty-box D's, the four corner arcs) uses `rx === ry`,
 * i.e. a true circular arc — transformed for the given orientation.
 * `toScreen` is a proper rotation, not a mirror (see its doc comment), so
 * the `sweepFlag` that decides which side of the chord the arc bulges
 * toward never needs to flip between orientations; only its two endpoints
 * move.
 */
function arcPath(
  x1: number,
  y1: number,
  r: number,
  sweepFlag: 0 | 1,
  x2: number,
  y2: number,
  orientation: PitchOrientation
): string {
  const p1 = toScreen(x1, y1, orientation);
  const p2 = toScreen(x2, y2, orientation);
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 ${sweepFlag} ${p2.x} ${p2.y}`;
}

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
  /**
   * Pitch orientation. Defaults to `landscape` — every existing consumer
   * renders identically to today. `portrait` rotates the pitch a
   * quarter-turn so the own goal sits at the bottom of the box and the
   * opposition goal at the top (attacking UP the screen), for a lineup that
   * needs to fill a phone-shaped viewport. See {@link PitchOrientation} /
   * {@link toScreen} for the coordinate mapping — the hardcoded
   * `aspect-[3/2]` also becomes `aspect-[2/3]` in this mode.
   */
  orientation?: PitchOrientation;
  /** Children to render on the pitch (markers, arrows, etc.) */
  children?: React.ReactNode;
}

/**
 * SVG football pitch component
 *
 * Coordinate system (authored space — unchanged by `orientation`):
 * - Every marking is authored in a normalized 0–100 space: x: 0 = own goal
 *   line, 100 = opposition goal line; y: 0 = left touchline, 100 = right
 *   touchline. ViewBox: 0 0 100 100 (full pitch), 50 0 50 100 (half), or
 *   66.67 0 33.33 100 (attacking third) in `landscape`.
 * - `orientation="landscape"` (default) renders that authored space as-is —
 *   this is the identity mapping, i.e. today's exact behaviour.
 * - `orientation="portrait"` renders the SAME authored space rotated a
 *   quarter-turn onto the screen (own goal at the bottom, opposition goal at
 *   the top). See {@link toScreen} for the mapping and {@link PitchProps.orientation}.
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
  orientation = 'landscape',
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
  // `base` is authored in landscape terms ("the attacking half/third");
  // `screenRect` remaps it to where that box actually lands on screen for the
  // requested orientation — e.g. `half` becomes the TOP half in portrait
  // (0 0 100 50), since the attacking half is now the one near the
  // opposition goal at the top. Identity in landscape, so this is exactly
  // today's `base` for the default orientation.
  const screenBase = screenRect(base.x, base.y, base.w, base.h, orientation);
  const pad = Number.isFinite(padding) ? Math.max(0, padding) : 0;
  const viewBox = `${screenBase.x - pad} ${screenBase.y - pad} ${screenBase.width + pad * 2} ${screenBase.height + pad * 2}`;
  // The OUTER rendered box keeps the exact aspect it had before — the default
  // `aspect-[3/2]` className (or whatever a caller overrides it to, e.g. the
  // square canvas blocks' `!aspect-square`) — so padding never changes a block's
  // shape or, for the canvas-overlay blocks, its alignment with the sibling
  // canvas. Padding only GROWS the viewBox symmetrically: with the default
  // `preserveAspectRatio="xMidYMid meet"` the pitch then sits centred and
  // slightly inset, opening an even gutter on all sides for edge markers. And
  // `overflow: visible` lets a marker reaching just past the padded box still
  // paint instead of being cut at the frame.
  const aspectClass = orientation === 'portrait' ? 'aspect-[2/3]' : 'aspect-[3/2]';

  // Pitch-marking geometry, remapped once for the requested orientation.
  // Every shape below is still authored at its original LANDSCAPE numbers —
  // `toScreen` / `screenRect` / `arcPath` are what place those authored
  // numbers on screen for `portrait`, and are the identity in `landscape`,
  // so this is exactly today's geometry when the prop isn't passed.
  const halfwayLine = { p1: toScreen(50, 0, orientation), p2: toScreen(50, 100, orientation) };
  const centerSpot = toScreen(50, 50, orientation);
  const ownBox = screenRect(0, 21.1, 16.5, 57.8, orientation);
  const ownSixYardBox = screenRect(0, 36.8, 5.5, 26.4, orientation);
  const ownPenaltySpot = toScreen(11, 50, orientation);
  const ownArc = arcPath(16.5, 40.1, 9.15, 1, 16.5, 59.9, orientation);
  const ownGoal = screenRect(-2, 45.2, 2, 9.6, orientation);
  const oppBox = screenRect(83.5, 21.1, 16.5, 57.8, orientation);
  const oppSixYardBox = screenRect(94.5, 36.8, 5.5, 26.4, orientation);
  const oppPenaltySpot = toScreen(89, 50, orientation);
  const oppArc = arcPath(83.5, 40.1, 9.15, 0, 83.5, 59.9, orientation);
  const oppGoal = screenRect(100, 45.2, 2, 9.6, orientation);
  const cornerArcs = [
    arcPath(0, 1, 1, 0, 1, 0, orientation),
    arcPath(0, 99, 1, 1, 1, 100, orientation),
    arcPath(99, 0, 1, 0, 100, 1, orientation),
    arcPath(99, 100, 1, 1, 100, 99, orientation),
  ];

  return (
    <svg
      viewBox={viewBox}
      className={cn(
        fit === 'height' ? 'h-full w-auto max-w-full' : 'w-full h-auto',
        aspectClass,
        className
      )}
      style={{ overflow: 'visible' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background — the full 0–100 square is a fixed shape of `toScreen`
          (its four corners just permute), so it stays hardcoded in both
          orientations. */}
      <rect x="0" y="0" width="100" height="100" fill={resolvedGrass} />

      {/* Grass pattern stripes — perpendicular to the direction of play in
          both orientations: full-length vertical bands in landscape
          (goal-to-goal), full-width horizontal bands in portrait
          (touchline-to-touchline), via the same `screenRect` remap as every
          other rect marking below. */}
      {resolvedShowPattern && (
        <g opacity="0.15">
          {[0, 20, 40, 60, 80].map((x) => {
            const stripe = screenRect(x, 0, 10, 100, orientation);
            return (
              <rect
                key={x}
                x={stripe.x}
                y={stripe.y}
                width={stripe.width}
                height={stripe.height}
                fill="var(--color-pitch-grass-light)"
              />
            );
          })}
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
        {/* Pitch outline — also a fixed shape of `toScreen`, stays hardcoded. */}
        <rect x="0" y="0" width="100" height="100" />

        {/* Halfway line */}
        <line
          x1={halfwayLine.p1.x}
          y1={halfwayLine.p1.y}
          x2={halfwayLine.p2.x}
          y2={halfwayLine.p2.y}
        />

        {/* Center circle — (50, 50) is `toScreen`'s fixed point, so this stays
            centred in both orientations, as a circle with no "direction" must. */}
        <circle cx={centerSpot.x} cy={centerSpot.y} r="9.15" />
        <circle cx={centerSpot.x} cy={centerSpot.y} r="0.6" fill={resolvedLines} stroke="none" />

        {/* Own penalty area (own goal at x=0 → bottom of the box in portrait) */}
        <rect x={ownBox.x} y={ownBox.y} width={ownBox.width} height={ownBox.height} />
        <rect
          x={ownSixYardBox.x}
          y={ownSixYardBox.y}
          width={ownSixYardBox.width}
          height={ownSixYardBox.height}
        />
        <circle
          cx={ownPenaltySpot.x}
          cy={ownPenaltySpot.y}
          r="0.6"
          fill={resolvedLines}
          stroke="none"
        />
        <path d={ownArc} />

        {/* Own goal */}
        <rect
          x={ownGoal.x}
          y={ownGoal.y}
          width={ownGoal.width}
          height={ownGoal.height}
          strokeWidth={isDark ? 0.35 : 0.2}
        />

        {/* Opposition penalty area (opposition goal at x=100 → top of the box in portrait) */}
        <rect x={oppBox.x} y={oppBox.y} width={oppBox.width} height={oppBox.height} />
        <rect
          x={oppSixYardBox.x}
          y={oppSixYardBox.y}
          width={oppSixYardBox.width}
          height={oppSixYardBox.height}
        />
        <circle
          cx={oppPenaltySpot.x}
          cy={oppPenaltySpot.y}
          r="0.6"
          fill={resolvedLines}
          stroke="none"
        />
        <path d={oppArc} />

        {/* Opposition goal */}
        <rect
          x={oppGoal.x}
          y={oppGoal.y}
          width={oppGoal.width}
          height={oppGoal.height}
          strokeWidth={isDark ? 0.35 : 0.2}
        />

        {/* Corner arcs */}
        {cornerArcs.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* Children (markers, arrows, etc.) */}
      {children}
    </svg>
  );
}
