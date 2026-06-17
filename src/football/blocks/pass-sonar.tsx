import { useId, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';

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
}

const TEAM_COLOR = '#eb0000';

// Sonar geometry, in pitch viewBox units (the Pitch primitive is 100 × 100).
const BASE_RADIUS = 4.2; // resting outer reach of the longest wedge
const MIN_WEDGE = 0.6; // floor so a short-pass wedge stays visible
// Pass length (m) that maps to a full-radius wedge; longer passes clamp here.
const MAX_PASS_LENGTH = 45;

// Take-over focus: the hovered sonar floats to the pitch centre and blows up.
const FOCUS_CX = 50;
const FOCUS_CY = 50;
const FOCUS_RADIUS = 30; // outer reach of the longest wedge when focused

/** Up-to-two initials for the monogram ("Lionel Messi" → "LM"). */
function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

/** Last token of a name, for the under-sonar label ("Bukayo Saka" → "Saka"). */
function surname(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? name;
}

/** Clamp helper. */
function clamp(v: number, lo: number, hi: number): number {
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
 * Pass sonars — the iconic StatsBomb radial passing diagram on the BTL dark
 * surface, styled to sit quietly next to the Shot map and Lineup builder. Each
 * player gets a small polar diagram at their average position: the circle is
 * split into directional wedges, each wedge's radius is the average pass length
 * in that direction and its colour intensity is the pass volume.
 *
 * Hovering or focusing a player takes over the viz: that sonar floats to the
 * centre of the pitch and blows up large while the pitch and every other sonar
 * dim back, so the reader can actually read one player's directional profile —
 * his name, total passes and average pass length. Move out and it settles back
 * into formation. Wedges grow out on mount, staggered by player.
 */
export function PassSonar({
  team,
  crestUrl,
  color = TEAM_COLOR,
  players,
  className,
}: PassSonarProps) {
  const clipPrefix = useId();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Volume ceiling across all wedges drives the shared colour-intensity scale,
  // so a busy hub reads denser than a quiet one within the same team.
  const maxCount = useMemo(() => {
    let m = 0;
    for (const p of players) {
      for (const w of p.wedges) if (w.count > m) m = w.count;
    }
    return m;
  }, [players]);

  const active = useMemo(() => players.find((p) => p.id === activeId) ?? null, [players, activeId]);

  return (
    <div
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

      {/* Pitch + sonars */}
      <div className="relative">
        <Pitch variant="full" theme="dark">
          {/* Whole-pitch scrim: dims pitch + resting sonars behind the focus. */}
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
            const longest = player.wedges.reduce((m, w) => Math.max(m, w.avgLength), 0) || 1;
            // Scale by the longer of the player's own longest pass and the
            // full-length cap, so a player who only plays short still shows
            // proportionate wedges but a long-spraying player isn't clipped.
            const lengthCeiling = Math.max(longest, MAX_PASS_LENGTH * 0.5);
            const span = player.wedges.length > 0 ? 360 / player.wedges.length : 360;

            // When active, the sonar takes over: re-anchored to the pitch centre
            // and drawn at the large focus radius. Otherwise it rests in place.
            const cx = isActive ? FOCUS_CX : player.x;
            const cy = isActive ? FOCUS_CY : player.y;
            const reach = isActive ? FOCUS_RADIUS : BASE_RADIUS;

            return (
              <motion.g
                key={player.id}
                role="button"
                tabIndex={0}
                aria-label={`${player.name}, ${totalPasses(player)} passes`}
                className="cursor-pointer focus:outline-none"
                onMouseEnter={() => setActiveId(player.id)}
                onMouseLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(player.id)}
                onBlur={() => setActiveId(null)}
                initial={false}
                animate={{ opacity: dimmed ? 0.12 : 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {/* Faint hub disc so an empty direction still anchors the player. */}
                <motion.circle
                  initial={false}
                  animate={{ cx, cy, r: reach }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  fill="white"
                  fillOpacity={isActive ? 0.05 : 0.03}
                  stroke="white"
                  strokeOpacity={isActive ? 0.16 : 0.08}
                  strokeWidth={isActive ? 0.12 : 0.25}
                />

                {player.wedges.map((wedge, wedgeIndex) => {
                  const lengthFrac = clamp(wedge.avgLength / lengthCeiling, 0, 1);
                  const r = MIN_WEDGE + lengthFrac * (reach - MIN_WEDGE);
                  // Volume → fill opacity, on a gentle curve so mid-volume
                  // directions still register against the dark pitch.
                  const volFrac = maxCount > 0 ? wedge.count / maxCount : 0;
                  const fillOpacity = 0.16 + Math.sqrt(volFrac) * 0.72;
                  const d = wedgePath(cx, cy, r, wedge.angleDeg, span);

                  return (
                    <motion.path
                      key={`${player.id}-w${wedgeIndex}`}
                      fill={color}
                      stroke={color}
                      strokeWidth={isActive ? 0.08 : 0.18}
                      strokeOpacity={0.6}
                      initial={{ opacity: 0, d }}
                      animate={{ opacity: fillOpacity, d }}
                      transition={{
                        opacity: {
                          duration: 0.5,
                          ease: 'easeOut',
                          delay: activeId === null ? 0.04 * playerIndex + 0.012 * wedgeIndex : 0,
                        },
                        d: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                      }}
                    />
                  );
                })}

                {/* Hub dot. */}
                <motion.circle
                  initial={false}
                  animate={{ cx, cy, r: isActive ? 1.4 : 0.7 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  fill="white"
                  fillOpacity={0.85}
                />

                {/* Quiet surname label beneath the resting sonar (hidden while
                    this sonar is the focused take-over — the overlay names it). */}
                <motion.text
                  x={player.x}
                  y={player.y + BASE_RADIUS + 2.6}
                  textAnchor="middle"
                  fill="white"
                  fontSize="2.4"
                  fontWeight="600"
                  initial={false}
                  animate={{ opacity: isActive ? 0 : 0.7 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{ pointerEvents: 'none' }}
                >
                  {surname(player.name)}
                </motion.text>
              </motion.g>
            );
          })}

          {/* Focus overlay for the taken-over player, drawn last (on top). */}
          {active && (
            <FocusOverlay
              player={active}
              total={totalPasses(active)}
              avgLength={avgPassLength(active)}
              color={color}
              clipId={`${clipPrefix}-focus`}
            />
          )}
        </Pitch>
      </div>
    </div>
  );
}

/**
 * The taken-over player's read-out, overlaid on the dimmed pitch beside the
 * centred sonar: a circular headshot (monogram fallback), name, and a clean
 * breakdown — total passes and average pass length. No metric legend; the big
 * centred sonar makes the radius/intensity encoding self-evident.
 */
function FocusOverlay({
  player,
  total,
  avgLength,
  color,
  clipId,
}: {
  player: PassSonarPlayer;
  total: number;
  avgLength: number;
  color: string;
  clipId: string;
}) {
  // Header sits along the top of the pitch, clear of the centred sonar.
  const avatarR = 4.2;
  const avatarCx = 10 + avatarR;
  const avatarCy = 10;
  const textX = avatarCx + avatarR + 3;

  return (
    <motion.g
      initial={{ opacity: 0, y: -1.5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: 'easeOut' }}
      style={{ pointerEvents: 'none' }}
    >
      {/* Circular headshot, or a monogram chip when no photo is supplied. */}
      {player.imageUrl ? (
        <>
          <defs>
            <clipPath id={clipId}>
              <circle cx={avatarCx} cy={avatarCy} r={avatarR} />
            </clipPath>
          </defs>
          <circle cx={avatarCx} cy={avatarCy} r={avatarR} fill={color} />
          <image
            href={player.imageUrl}
            x={avatarCx - avatarR}
            y={avatarCy - avatarR}
            width={avatarR * 2}
            height={avatarR * 2}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
          />
          <circle
            cx={avatarCx}
            cy={avatarCy}
            r={avatarR}
            fill="none"
            stroke={color}
            strokeWidth={0.4}
            strokeOpacity={0.95}
          />
        </>
      ) : (
        <>
          <circle cx={avatarCx} cy={avatarCy} r={avatarR} fill={color} fillOpacity={0.9} />
          <text
            x={avatarCx}
            y={avatarCy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={avatarR * 0.95}
            fontWeight="bold"
            fill="#0a0a0a"
          >
            {monogram(player.name)}
          </text>
        </>
      )}

      {/* Name + breakdown. */}
      <text x={textX} y={avatarCy - 0.8} fontSize={4} fontWeight="bold" fill="white">
        {player.name}
      </text>
      <text
        x={textX}
        y={avatarCy + 4}
        fontSize={2.6}
        fill="white"
        fillOpacity={0.6}
        style={{ letterSpacing: '0.02em' }}
      >
        {total} passes · {avgLength.toFixed(1)} m avg
      </text>
    </motion.g>
  );
}
