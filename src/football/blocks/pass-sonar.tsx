import { useId, useMemo, useState, type ReactNode } from 'react';
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
const HOVER_RADIUS = 6.6; // outer reach when a player's sonar is lifted
const MIN_WEDGE = 0.6; // floor so a short-pass wedge stays visible
// Pass length (m) that maps to a full-radius wedge; longer passes clamp here.
const MAX_PASS_LENGTH = 45;

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

/**
 * Pass sonars — the iconic StatsBomb radial passing diagram on the BTL dark
 * surface, styled to sit quietly next to the Shot map and Lineup builder. Each
 * player gets a small polar diagram at their average position: the circle is
 * split into directional wedges, each wedge's radius is the average pass length
 * in that direction and its colour intensity is the pass volume. Hovering or
 * focusing a player lifts and enlarges their sonar, dims the rest, and surfaces
 * a callout with the player's headshot, name and total passes. Wedges grow out
 * on mount, staggered by player.
 */
export function PassSonar({ team, color = TEAM_COLOR, players, className }: PassSonarProps) {
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

  const total = (p: PassSonarPlayer) => p.wedges.reduce((sum, w) => sum + w.count, 0);

  const active = useMemo(() => players.find((p) => p.id === activeId) ?? null, [players, activeId]);

  return (
    <div
      className={cn(
        'my-6 rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4',
        'shadow-[0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-[12px] [border-top-color:rgba(255,255,255,0.10)]',
        className
      )}
    >
      {/* Header: one plain title + small team key. */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold tracking-tight text-white">Pass sonars</span>
        <span className="flex items-center gap-1.5 text-[11px] text-white/60">
          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate">{team}</span>
        </span>
      </div>

      {/* Pitch + sonars */}
      <div className="relative">
        <Pitch variant="full" theme="dark">
          {players.map((player, playerIndex) => {
            const isActive = player.id === activeId;
            const dimmed = activeId !== null && !isActive;
            const reach = isActive ? HOVER_RADIUS : BASE_RADIUS;
            const longest = player.wedges.reduce((m, w) => Math.max(m, w.avgLength), 0) || 1;
            // Scale by the longer of the player's own longest pass and the
            // full-length cap, so a player who only plays short still shows
            // proportionate wedges but a long-spraying player isn't clipped.
            const lengthCeiling = Math.max(longest, MAX_PASS_LENGTH * 0.5);
            const span = player.wedges.length > 0 ? 360 / player.wedges.length : 360;

            return (
              <motion.g
                key={player.id}
                role="button"
                tabIndex={0}
                aria-label={`${player.name}, ${total(player)} passes`}
                className="cursor-pointer focus:outline-none"
                onMouseEnter={() => setActiveId(player.id)}
                onMouseLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(player.id)}
                onBlur={() => setActiveId(null)}
                initial={false}
                animate={{ opacity: dimmed ? 0.26 : 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                {/* Faint hub disc so an empty direction still anchors the player. */}
                <circle
                  cx={player.x}
                  cy={player.y}
                  r={reach}
                  fill="white"
                  fillOpacity={isActive ? 0.05 : 0.03}
                  stroke="white"
                  strokeOpacity={isActive ? 0.18 : 0.08}
                  strokeWidth={0.25}
                />

                {player.wedges.map((wedge, wedgeIndex) => {
                  const lengthFrac = clamp(wedge.avgLength / lengthCeiling, 0, 1);
                  const r = MIN_WEDGE + lengthFrac * (reach - MIN_WEDGE);
                  // Volume → fill opacity, on a gentle curve so mid-volume
                  // directions still register against the dark pitch.
                  const volFrac = maxCount > 0 ? wedge.count / maxCount : 0;
                  const fillOpacity = 0.16 + Math.sqrt(volFrac) * 0.72;
                  const d = wedgePath(player.x, player.y, r, wedge.angleDeg, span);

                  return (
                    <motion.path
                      key={`${player.id}-w${wedgeIndex}`}
                      d={d}
                      fill={color}
                      stroke={color}
                      strokeWidth={0.18}
                      strokeOpacity={0.6}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: fillOpacity,
                        scale: 1,
                      }}
                      transition={{
                        duration: 0.5,
                        ease: 'easeOut',
                        delay: 0.04 * playerIndex + 0.012 * wedgeIndex,
                      }}
                      style={{
                        transformBox: 'fill-box',
                        transformOrigin: `${player.x}px ${player.y}px`,
                      }}
                    />
                  );
                })}

                {/* Hub dot. */}
                <circle cx={player.x} cy={player.y} r={0.7} fill="white" fillOpacity={0.85} />

                {/* Quiet surname label beneath the sonar (data, not decoration). */}
                <text
                  x={player.x}
                  y={player.y + reach + 2.6}
                  textAnchor="middle"
                  fill="white"
                  fontSize="2.4"
                  fontWeight="600"
                  fillOpacity={isActive ? 0.95 : 0.7}
                  style={{ pointerEvents: 'none' }}
                >
                  {surname(player.name)}
                </text>
              </motion.g>
            );
          })}

          {/* Callout for the active player, drawn last so it sits on top. */}
          {active && (
            <Callout
              player={active}
              total={total(active)}
              color={color}
              clipId={`${clipPrefix}-callout`}
            />
          )}
        </Pitch>
      </div>

      {/* Reading key — what radius and intensity mean. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/60">
        <span className="flex items-center gap-1.5">
          <RadiusGlyph color={color} />
          <span>Reach = avg pass length</span>
        </span>
        <span className="flex items-center gap-1.5">
          <IntensityGlyph color={color} />
          <span>Intensity = pass volume</span>
        </span>
      </div>
    </div>
  );
}

/** Tiny glyph: a small then large wedge, keying radius → pass length. */
function RadiusGlyph({ color }: { color: string }) {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden>
      <path d="M3 6 L3 6 A4 4 0 0 1 9 3 Z" fill={color} fillOpacity={0.85} />
      <path d="M3 6 L3 6 A2 2 0 0 1 6 4.6 Z" fill={color} fillOpacity={0.85} />
    </svg>
  );
}

/** Tiny glyph: faint → solid swatch, keying colour intensity → volume. */
function IntensityGlyph({ color }: { color: string }) {
  return (
    <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden>
      <rect x="0" y="2" width="6" height="6" rx="1" fill={color} fillOpacity={0.22} />
      <rect x="8" y="2" width="6" height="6" rx="1" fill={color} fillOpacity={0.5} />
      <rect x="16" y="2" width="6" height="6" rx="1" fill={color} fillOpacity={0.9} />
    </svg>
  );
}

/**
 * Floating callout for the active player: a circular headshot (monogram
 * fallback) + name + total passes. Mirrors the shot-map callout geometry so the
 * card never spills off the pitch.
 */
function Callout({
  player,
  total,
  color,
  clipId,
}: {
  player: PassSonarPlayer;
  total: number;
  color: string;
  clipId: string;
}) {
  // Keep the card inside the pitch: flip side/vertical near the edges.
  const flipX = player.x > 62;
  const flipY = player.y < 22;
  const w = 36;
  const h = 13;
  const gap = HOVER_RADIUS + 1.5;
  const boxX = flipX ? player.x - w - gap : player.x + gap;
  const boxY = flipY ? player.y + gap : player.y - h - gap;

  const avatarR = 4;
  const avatarCx = boxX + 2.4 + avatarR;
  const avatarCy = boxY + h / 2;
  const textX = avatarCx + avatarR + 2;

  return (
    <motion.g
      initial={{ opacity: 0, y: 1.5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{ pointerEvents: 'none' }}
    >
      <rect
        x={boxX}
        y={boxY}
        width={w}
        height={h}
        rx={1.4}
        fill="#0a0a0a"
        fillOpacity={0.92}
        stroke={color}
        strokeOpacity={0.55}
        strokeWidth={0.3}
      />
      {/* Accent tick. */}
      <rect x={boxX} y={boxY} width={1} height={h} rx={0.4} fill={color} />

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

      <text x={textX} y={boxY + 5.2} fontSize={2.7} fontWeight="bold" fill="white">
        {player.name}
      </text>
      <text
        x={textX}
        y={boxY + 9}
        fontSize={2.2}
        fill="white"
        fillOpacity={0.55}
        style={{ letterSpacing: '0.04em' }}
      >
        {total} passes
      </text>
    </motion.g>
  );
}
