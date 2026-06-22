import { useId, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import { surname } from '#/football/lib/player-name';
import { PanelFooter } from '#/football/lib/panel-footer';
import { BLOCK_FONT_STACK } from '#/football/lib/font';
import { SvgHeadshot } from '#/football/lib/headshot';
import { finite } from '#/football/lib/finite';

/** A single directional bucket of a player's passing. */
export interface PassWedge {
  /**
   * Centre of the angle bucket, in degrees. 0° points toward the opposition
   * goal (the team's attacking direction, +x on the pitch); 90° points toward
   * the right touchline (+y); angles increase clockwise. Buckets are assumed
   * evenly spaced around the circle (e.g. 16 buckets ⇒ 22.5° each).
   */
  angleDeg: number;
  /** Average completed pass length in this direction, in metres. Drives wedge radius. */
  avgLength: number;
  /** Number of passes in this direction. Drives wedge colour intensity. */
  count: number;
}

/** A single player's sonar, anchored at their average pitch position. */
export interface PassSonarPlayer {
  /** Stable identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Average x on the 0–100 pitch scale (0 = own goal line, 100 = opposition). */
  x: number;
  /** Average y on the 0–100 pitch scale (0 = left touchline, 100 = right). */
  y: number;
  /** Headshot URL for the hover callout (monogram fallback). */
  imageUrl?: string;
  /** Directional passing buckets. */
  wedges: PassWedge[];
}

export interface PassSonarProps {
  /** Team display name. */
  team: string;
  /** Optional team crest/flag URL, rendered small beside the team name. */
  crestUrl?: string;
  /** Team accent. Defaults to BTL home red. */
  color?: string;
  /** Players to plot, each with an average position and directional wedges. */
  players: PassSonarPlayer[];
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

const TEAM_COLOR = '#eb0000';

// Sonar geometry, in pitch viewBox units (the Pitch primitive is 100 × 100).
const BASE_RADIUS = 4.2; // resting outer reach of the longest small wedge
const MIN_WEDGE = 0.6; // floor so a short-pass wedge stays visible
// Pass length (m) that maps to a full-radius wedge; longer passes clamp here.
const MAX_PASS_LENGTH = 45;

// Take-over focus: a freshly-drawn, enlarged sonar is rendered as a separate
// overlay (not the small in-place sonar growing). It is anchored at the
// player's OWN pitch position — not a fixed centre slot — so the reader keeps
// the spatial context of where on the pitch that passing shape happened. The
// radius is enough to read every wedge but small enough to sit on the field;
// the anchor is clamped so the disc never spills past the touchlines.
const FOCUS_RADIUS = 13; // outer reach of the longest wedge in the focus overlay
const FOCUS_MARGIN = 1.5; // keep the focus disc this far inside the pitch edge

/** Clamp helper. A non-finite input collapses to the low bound. */
function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Point on the pitch for a wedge edge. Angle is measured from the +x axis
 * (toward the opposition goal) and increases clockwise toward +y (the right
 * touchline) — matching how the data is described and how a fixed viewer reads
 * the pitch. SVG y grows downward, so clockwise in data is clockwise on screen.
 */
function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/**
 * Build the SVG path for one wedge: a filled circular sector centred on
 * `angleDeg`, spanning `spanDeg`, from the hub out to `r`.
 */
function wedgePath(cx: number, cy: number, r: number, angleDeg: number, spanDeg: number): string {
  const half = spanDeg / 2;
  const start = polar(cx, cy, r, angleDeg - half);
  const end = polar(cx, cy, r, angleDeg + half);
  // span is always < 180° for any sane bucket count, so large-arc flag is 0.
  return [
    `M ${cx.toFixed(3)} ${cy.toFixed(3)}`,
    `L ${start.x.toFixed(3)} ${start.y.toFixed(3)}`,
    `A ${r.toFixed(3)} ${r.toFixed(3)} 0 0 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`,
    'Z',
  ].join(' ');
}

/** Total passes summed across a player's wedges. */
function totalPasses(p: PassSonarPlayer): number {
  return p.wedges.reduce((sum, w) => sum + w.count, 0);
}

/** Count-weighted average pass length across a player's wedges, in metres. */
function avgPassLength(p: PassSonarPlayer): number {
  let lenSum = 0;
  let n = 0;
  for (const w of p.wedges) {
    lenSum += w.avgLength * w.count;
    n += w.count;
  }
  return n > 0 ? lenSum / n : 0;
}

/**
 * SHARED length scale across the whole XI, so the small multiples are a fair
 * comparison: a long-range passer's wedges genuinely out-reach a short passer's
 * rather than every player's longest wedge filling its own disc (which made all
 * 11 sonars look the same size). Taken as the team's longest wedge, but capped
 * at {@link MAX_PASS_LENGTH} so a single freak long ball can't shrink everyone
 * else into a dot, and floored so a low-volume team still spans the disc.
 */
function teamLengthCeiling(players: PassSonarPlayer[]): number {
  let longest = 0;
  for (const p of players) {
    for (const w of p.wedges) if (w.avgLength > longest) longest = w.avgLength;
  }
  return clamp(longest, MAX_PASS_LENGTH * 0.6, MAX_PASS_LENGTH);
}

/**
 * Volume → fill opacity. The count is taken as a fraction of a SOFTENED ceiling
 * (`maxCount` eased down toward the mean) and pushed through a sqrt, so the one
 * busiest direction no longer hogs all the saturation — mid-volume wedges read
 * as genuinely coloured rather than washed-out, and even the quietest stays
 * above the floor. The single most-used direction still tops the ramp.
 */
function fillOpacityFor(count: number, maxCount: number): number {
  const volFrac = maxCount > 0 ? Math.min(1, count / maxCount) : 0;
  return 0.26 + Math.sqrt(volFrac) * 0.66;
}

/**
 * Pass sonars — the iconic StatsBomb radial passing diagram on the BTL dark
 * surface, styled to sit quietly next to the Shot map and Lineup builder. Each
 * player gets a small polar diagram at their average position: the circle is
 * split into directional wedges, each wedge's radius is the average pass length
 * in that direction and its colour intensity is the pass volume.
 *
 * Hovering a player takes over the viz: the small sonars and pitch dim back
 * (opacity only — the small sonars never move or morph) while a freshly-drawn
 * LARGE copy of that player's sonar fades and scales in as a separate overlay,
 * with his name, total passes, average pass length, headshot and crest. The
 * dimming scrim and the overlay are both pointer-transparent and focus is
 * driven solely off each small sonar's hit-area, so leaving a sonar (or the
 * pitch) always clears the take-over — no element can trap the cursor.
 */
export function PassSonar({
  team,
  crestUrl,
  color = TEAM_COLOR,
  players,
  className,
  wordmark,
  builderControls,
}: PassSonarProps) {
  const clipPrefix = useId();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Colour-intensity ceiling across all wedges. Rather than the raw single max
  // (which let one dominant direction monopolise the saturation and washed the
  // rest out), this is the busiest direction eased toward the mean — a "soft
  // max" — so mid-volume wedges read as properly coloured while the top
  // direction still sits at the ceiling. Floored at 1 to avoid /0.
  const maxCount = useMemo(() => {
    let peak = 0;
    let sum = 0;
    let n = 0;
    for (const p of players) {
      for (const w of p.wedges) {
        if (w.count > peak) peak = w.count;
        sum += w.count;
        n += 1;
      }
    }
    if (peak <= 0) return 1;
    const mean = n > 0 ? sum / n : peak;
    // Pull the ceiling 35% of the way from the peak down toward the mean.
    return Math.max(1, peak - (peak - mean) * 0.35);
  }, [players]);

  // One length scale shared by every player's resting sonar (a fair comparison).
  const sharedLengthCeiling = useMemo(() => teamLengthCeiling(players), [players]);

  const active = useMemo(() => players.find((p) => p.id === activeId) ?? null, [players, activeId]);

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
      {/* Header: one plain title + small team key (crest + name). */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold tracking-tight text-white">Pass sonars</span>
        <span className="flex items-center gap-1.5 text-[11px] text-white/60">
          {crestUrl ? (
            <img src={crestUrl} alt="" aria-hidden className="size-4 rounded-full object-contain" />
          ) : (
            <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
          )}
          <span className="truncate">{team}</span>
        </span>
      </div>

      {/* Pitch + sonars. Leaving the whole pitch clears focus as a backstop, so
          the take-over can never persist once the cursor is off the field.
          Square box so the 100×100 Pitch viewBox fills it rather than being
          letterboxed into the centre third of a 3:2 frame — which is what
          crammed the sonars together and detached them from their real spots. */}
      <div className="relative aspect-square w-full">
        <Pitch
          variant="full"
          theme="dark"
          className="absolute inset-0 !aspect-square h-full w-full"
        >
          <g onPointerLeave={() => setActiveId(null)}>
            {/* Whole-pitch scrim: dims pitch + resting sonars behind the focus.
                Pointer-transparent so it can never swallow a leave event. */}
            <motion.rect
              x={0}
              y={0}
              width={100}
              height={100}
              fill="#0a0a0a"
              initial={false}
              animate={{ opacity: active ? 0.66 : 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              style={{ pointerEvents: 'none' }}
            />

            {players.map((player, playerIndex) => {
              const isActive = player.id === activeId;
              const dimmed = activeId !== null && !isActive;
              const lengthCeiling = sharedLengthCeiling;
              const span = player.wedges.length > 0 ? 360 / player.wedges.length : 360;
              // Average position can be missing on sparse data — guard so the hub,
              // wedges, hit-area and label never get NaN coordinates.
              const px = finite(player.x);
              const py = finite(player.y);

              return (
                <g key={player.id}>
                  {/* Resting sonar. FIXED size at the avg position — it never
                      moves or morphs; on take-over it only dims (opacity). */}
                  <motion.g
                    initial={false}
                    animate={{ opacity: dimmed ? 0.12 : isActive ? 0.32 : 1 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    style={{ pointerEvents: 'none' }}
                  >
                    {/* Faint hub disc so an empty direction still anchors the player. */}
                    <circle
                      cx={px}
                      cy={py}
                      r={BASE_RADIUS}
                      fill="white"
                      fillOpacity={0.03}
                      stroke="white"
                      strokeOpacity={0.08}
                      strokeWidth={0.25}
                    />

                    {player.wedges.map((wedge, wedgeIndex) => {
                      const lengthFrac = clamp(wedge.avgLength / lengthCeiling, 0, 1);
                      const r = MIN_WEDGE + lengthFrac * (BASE_RADIUS - MIN_WEDGE);
                      const d = wedgePath(px, py, r, wedge.angleDeg, span);

                      return (
                        <motion.path
                          key={`${player.id}-w${wedgeIndex}`}
                          d={d}
                          fill={color}
                          stroke={color}
                          strokeWidth={0.18}
                          strokeOpacity={0.6}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: fillOpacityFor(wedge.count, maxCount) }}
                          transition={{
                            duration: 0.5,
                            ease: 'easeOut',
                            delay: 0.04 * playerIndex + 0.012 * wedgeIndex,
                          }}
                        />
                      );
                    })}

                    {/* Hub dot. */}
                    <circle cx={px} cy={py} r={0.7} fill="white" fillOpacity={0.85} />

                    {/* Quiet surname label beneath the resting sonar. */}
                    <text
                      x={px}
                      y={py + BASE_RADIUS + 2.6}
                      textAnchor="middle"
                      fill="white"
                      fontSize="2.4"
                      fontWeight="600"
                      opacity={0.7}
                    >
                      {surname(player.name)}
                    </text>
                  </motion.g>

                  {/* Transparent hit-area, drawn over the resting sonar, that
                      drives focus. This is the ONLY pointer-reactive element per
                      player; enter sets focus, leave clears it. It stays put (no
                      growth), so enter/leave fire cleanly every cycle. */}
                  <circle
                    cx={px}
                    cy={py}
                    r={BASE_RADIUS + 1.4}
                    fill="transparent"
                    role="button"
                    tabIndex={0}
                    aria-label={`${player.name}, ${totalPasses(player)} passes`}
                    className="cursor-pointer focus:outline-none"
                    onPointerEnter={() => setActiveId(player.id)}
                    onPointerLeave={() => setActiveId(null)}
                    onFocus={() => setActiveId(player.id)}
                    onBlur={() => setActiveId(null)}
                  />
                </g>
              );
            })}
          </g>

          {/* Focus overlay: a freshly-drawn large sonar + read-out for the
              taken-over player, drawn last (on top) and pointer-transparent.
              Enters/exits with transform + opacity only — no `d` animation. */}
          <AnimatePresence>
            {active && (
              <FocusOverlay
                key={active.id}
                player={active}
                total={totalPasses(active)}
                avgLength={avgPassLength(active)}
                color={color}
                maxCount={maxCount}
                lengthCeiling={sharedLengthCeiling}
                crestUrl={crestUrl}
                clipId={`${clipPrefix}-focus`}
              />
            )}
          </AnimatePresence>
        </Pitch>
      </div>

      <PanelFooter provider="statsbomb" wordmark={wordmark} builderControls={builderControls} />
    </div>
  );
}

/**
 * The taken-over player's read-out, overlaid on the dimmed pitch: a large,
 * freshly-drawn sonar centred in a clean focus slot, plus a circular headshot
 * (monogram fallback), name, crest and a clean breakdown — total passes and
 * average pass length. Drawn at the full focus radius from the start and
 * animated in with transform + opacity only (GPU-smooth; the wedge `d` paths
 * are static), so enter and exit are smooth and never stick mid-interpolation.
 * No metric legend; the big centred sonar makes the encoding self-evident.
 */
function FocusOverlay({
  player,
  total,
  avgLength,
  color,
  maxCount,
  lengthCeiling,
  crestUrl,
  clipId,
}: {
  player: PassSonarPlayer;
  total: number;
  avgLength: number;
  color: string;
  maxCount: number;
  lengthCeiling: number;
  crestUrl?: string;
  clipId: string;
}) {
  // Header sits along the top of the pitch, clear of the sonar.
  const avatarR = 4.2;
  const avatarCx = 10 + avatarR;
  const avatarCy = 10;
  const textX = avatarCx + avatarR + 3;
  const crestR = 2.6;

  const span = player.wedges.length > 0 ? 360 / player.wedges.length : 360;

  // Anchor the enlarged sonar at the player's OWN position, clamped so the
  // FOCUS_RADIUS disc never spills past the touchlines (a wide player would
  // otherwise have half his sonar clipped off the pitch).
  const bound = FOCUS_RADIUS + FOCUS_MARGIN;
  const focusCx = clamp(finite(player.x, 50), bound, 100 - bound);
  const focusCy = clamp(finite(player.y, 50), bound, 100 - bound);

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{ pointerEvents: 'none' }}
    >
      {/* The enlarged sonar itself, anchored at the player's pitch position.
          Scales up from its own centre via transform. The hub disc (radius
          FOCUS_RADIUS, centred on the focus point) makes the group's bbox
          centre the focus point, so `center` is the focus centre — and
          `fill-box` keeps the origin local to this group, never animating `d`. */}
      <motion.g
        initial={{ scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        {/* Faint hub disc + subtle range ring for the big sonar. */}
        <circle
          cx={focusCx}
          cy={focusCy}
          r={FOCUS_RADIUS}
          fill="white"
          fillOpacity={0.04}
          stroke="white"
          strokeOpacity={0.14}
          strokeWidth={0.12}
        />

        {player.wedges.map((wedge, wedgeIndex) => {
          const lengthFrac = clamp(wedge.avgLength / lengthCeiling, 0, 1);
          const r = MIN_WEDGE + lengthFrac * (FOCUS_RADIUS - MIN_WEDGE);
          const d = wedgePath(focusCx, focusCy, r, wedge.angleDeg, span);
          return (
            <path
              key={`focus-w${wedgeIndex}`}
              d={d}
              fill={color}
              stroke={color}
              strokeWidth={0.08}
              strokeOpacity={0.6}
              fillOpacity={fillOpacityFor(wedge.count, maxCount)}
            />
          );
        })}

        {/* Hub dot. */}
        <circle cx={focusCx} cy={focusCy} r={1.4} fill="white" fillOpacity={0.85} />
      </motion.g>

      {/* Circular headshot, or a monogram chip when no photo is supplied — or
          when the supplied one fails to load. */}
      <SvgHeadshot
        cx={avatarCx}
        cy={avatarCy}
        r={avatarR}
        name={player.name}
        imageUrl={player.imageUrl}
        color={color}
        ringColor={color}
        ringWidth={0.4}
        backingOpacity={0.9}
        monogramFill="#0a0a0a"
        monogramSizeRatio={0.95}
      />

      {/* Name + crest + breakdown. */}
      <text x={textX} y={avatarCy - 0.8} fontSize={4} fontWeight="bold" fill="white">
        {player.name}
      </text>
      <g transform={`translate(${textX}, ${avatarCy + 4})`}>
        {crestUrl ? (
          <>
            <defs>
              <clipPath id={`${clipId}-crest`}>
                <circle cx={crestR} cy={-0.9} r={crestR} />
              </clipPath>
            </defs>
            <image
              href={crestUrl}
              x={0}
              y={-0.9 - crestR}
              width={crestR * 2}
              height={crestR * 2}
              clipPath={`url(#${clipId}-crest)`}
              preserveAspectRatio="xMidYMid meet"
            />
          </>
        ) : null}
        <text
          x={crestUrl ? crestR * 2 + 1.4 : 0}
          y={0}
          fontSize={2.6}
          fill="white"
          fillOpacity={0.92}
          style={{ letterSpacing: '0.02em' }}
        >
          {total} passes · {avgLength.toFixed(1)} m avg
        </text>
      </g>
    </motion.g>
  );
}
