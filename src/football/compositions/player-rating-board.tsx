import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import type { PitchTheme } from '#/football/primitives/pitch';
import type { Formation, FormationPosition } from '#/football/types';
import { formatFormationLabel } from '#/football/compositions/formation-label';
import { finite, finitePositive } from '#/football/lib/finite';
import { BLOCK_FONT_STACK } from '#/football/lib/font';

/**
 * Player grade — 1 (best) through 6 (worst). BTL appropriates the BILD
 * 1-6 inverse scale: 1 = Excellent, 6 = Poor.
 */
export type PlayerGrade = 1 | 2 | 3 | 4 | 5 | 6;

/** A player rendered on the rating board. */
export interface PlayerRatingBoardEntry {
  player: FormationPosition;
  /** Cast grade. Omitted when no grade has landed yet. */
  grade?: PlayerGrade;
}

export interface PlayerRatingBoardProps {
  /** Formation data (lineup positions). */
  formation: Formation;
  /** Pitch visual theme. Defaults to `dark` for the Match Centre context. */
  theme?: PitchTheme;
  /** Per-player grade overrides keyed by player.id. */
  grades?: Map<string, PlayerGrade>;
  /**
   * Marker variant. 'confirmed' (default) for actual team sheets; 'predicted'
   * for derived/predicted lineups pre-kickoff.
   */
  markerVariant?: 'confirmed' | 'predicted';
  /** Click handler. Receives the FormationPosition that was tapped. */
  onPlayerClick?: (position: FormationPosition) => void;
  /** Currently-selected player id (for highlight ring). */
  selectedPlayerId?: string;
  /**
   * Marker radius, in viewBox units. The marker is rendered as a circle (the
   * jersey-badge convention shared with `PlayerMarker`); the grade is conveyed
   * through the fill colour rather than the marker shape. Default bumped to
   * `3.9` in Wave 6.4.8 so the jersey number reads cleanly at default viewport
   * sizes (the inner text scales with the radius).
   */
  markerSize?: number;
  /**
   * Top-graded emphasis. When `true` (default), the player with the best
   * grade (lowest value on the 1-6 inverse scale) is surrounded by a BTL-red
   * ring so the eye lands on them first. Set to `false` to suppress the
   * emphasis (e.g. when emphasising a different player externally).
   */
  emphasiseTopGraded?: boolean;
  /**
   * Team accent for the **ungraded** (empty-state) marker fill. When set, a
   * player who has no grade yet renders as a tinted jersey badge in this
   * colour instead of the default neutral grey — so the board can carry a
   * team identity on a surface where grades aren't the point (e.g. a Lineups
   * tab that reuses this board purely to show who is on the pitch).
   *
   * Graded markers are unaffected: they always use the BILD 1-6 red-intensity
   * gradient. When omitted, ungraded markers stay neutral grey (the Gradings
   * sub-tab "rate this match" empty state).
   */
  teamColor?: string;
  /** Additional CSS classes for the wrapper. */
  className?: string;
}

/**
 * Fill + stroke for an **ungraded** marker. Defaults to the neutral grey
 * empty state; when a `teamColor` is supplied the badge is tinted with the
 * team accent (a translucent fill so it reads as "not yet graded" rather than
 * a solid kit shirt) and given a matching stroke.
 */
function ungradedMarkerColors(teamColor: string | undefined): { fill: string; stroke: string } {
  if (!teamColor) {
    return {
      fill: 'color-mix(in srgb, var(--color-grey-400, #ccc4c4) 25%, transparent)',
      stroke: 'rgba(255,255,255,0.25)',
    };
  }
  return {
    fill: `color-mix(in srgb, ${teamColor} 80%, transparent)`,
    stroke: `color-mix(in srgb, ${teamColor} 55%, white)`,
  };
}

/**
 * Resolve a grade to a BTL-palette colour. 1 = strongest BTL red; 2-3 fade
 * through red-100/60; 4 = red-100/30; 5 = grey-300/40; 6 = grey-500/30.
 * Mirrors the cross-cutting GradeBox red-intensity gradient in @breakingthelines/design-system.
 */
function gradeFill(grade: PlayerGrade): string {
  switch (grade) {
    case 1:
      return 'var(--color-red-100, #eb0000)';
    case 2:
      return 'color-mix(in srgb, var(--color-red-100, #eb0000) 75%, transparent)';
    case 3:
      return 'color-mix(in srgb, var(--color-red-100, #eb0000) 50%, transparent)';
    case 4:
      return 'color-mix(in srgb, var(--color-red-100, #eb0000) 25%, transparent)';
    case 5:
      return 'color-mix(in srgb, var(--color-grey-300, #807c7c) 40%, transparent)';
    case 6:
    default:
      return 'color-mix(in srgb, var(--color-grey-500, #5f5f5f) 30%, transparent)';
  }
}

/**
 * Pick the player id with the lowest (best) grade. Ties resolve to the first
 * one encountered in map iteration order; callers usually build the grades
 * map from a deterministic source (e.g. team-sheet order) so the same player
 * wins on every render.
 */
function resolveTopGradedPlayerId(
  grades: Map<string, PlayerGrade> | undefined
): string | undefined {
  if (!grades || grades.size === 0) return undefined;
  let bestId: string | undefined;
  let bestGrade: PlayerGrade | undefined;
  for (const [id, grade] of grades) {
    if (bestGrade === undefined || grade < bestGrade) {
      bestGrade = grade;
      bestId = id;
    }
  }
  return bestId;
}

/**
 * PlayerRatingBoard renders a formation pitch with per-player **grade boxes**
 * laid out at each lineup slot. Grades follow BTL's 1-6 inverse scale
 * (1 = Excellent, 6 = Poor) and use the GradeBox red-intensity gradient.
 *
 * Tapping a marker invokes onPlayerClick — host wires this to the
 * @breakingthelines/design-system PlayerRatingCard sheet for view + write.
 *
 * Top-graded emphasis: the player with the lowest (best) grade is wrapped in
 * a BTL-red ring so the eye lands on them first. Suppress via
 * `emphasiseTopGraded={false}` when the host is emphasising a different
 * player externally.
 *
 * Empty state: when no grades are passed (`grades` undefined or absent for a
 * given player), the marker renders in greyscale at the same slot. The board
 * still reads as "this is who is on the pitch — they just haven't been graded
 * yet."
 */
export function PlayerRatingBoard({
  formation,
  theme = 'dark',
  grades,
  markerVariant = 'confirmed',
  onPlayerClick,
  selectedPlayerId,
  markerSize = 3.9,
  emphasiseTopGraded = true,
  teamColor,
  className,
}: PlayerRatingBoardProps) {
  const radius = finitePositive(markerSize, 3.9);
  const strokeDashArray = markerVariant === 'predicted' ? '0.6 0.4' : undefined;
  const effectiveOpacity = markerVariant === 'predicted' ? 0.6 : 1;
  const teamLabel = formation.team.shortName ?? formation.team.name;
  const formationLabel = formatFormationLabel(formation.formation);

  // Resolve the top-graded player (lowest value on the BTL 1-6 inverse scale
  // wins). Computed from the `grades` map; falls back to `undefined` when no
  // grades have landed yet, in which case no ring is drawn.
  const topGradedPlayerId = emphasiseTopGraded ? resolveTopGradedPlayerId(grades) : undefined;

  return (
    // Inter-first sans (product decision): opt out of the host page's editorial
    // serif so the chip + the pitch's SVG labels render in Inter.
    <div
      className={cn('flex flex-col', className)}
      data-slot="player-rating-board"
      style={{ fontFamily: BLOCK_FONT_STACK }}
    >
      {/* Formation chip — Wave 6.4.8 moved out of the pitch corner and onto
          its own row above the pitch frame so it reads as a heading, not a
          floating overlay. Centred horizontally; en-dash separated between
          team and formation. */}
      <div
        data-slot="player-rating-board-formation-chip"
        className="pointer-events-none mb-2 flex items-baseline justify-center gap-1.5 font-sans text-[12px] tracking-tight text-white/70"
      >
        <span className="font-semibold text-white/85">{teamLabel}</span>
        {formationLabel ? (
          <span className="tabular-nums text-white/60">{formationLabel}</span>
        ) : null}
      </div>
      <Pitch variant="full" theme={theme}>
        {formation.positions.map((pos) => {
          const grade = grades?.get(pos.player.id);
          const isSelected = pos.player.id === selectedPlayerId;
          const isTopGraded = pos.player.id === topGradedPlayerId;
          const ungraded = ungradedMarkerColors(teamColor);
          const fill = grade !== undefined ? gradeFill(grade) : ungraded.fill;
          const stroke = grade !== undefined ? 'rgba(255,255,255,0.6)' : ungraded.stroke;
          // Guard against a position missing its coords on sparse formation data.
          const posX = finite(pos.position.x);
          const posY = finite(pos.position.y);

          return (
            <g
              key={pos.player.id}
              onClick={() => onPlayerClick?.(pos)}
              className={cn(onPlayerClick && 'cursor-pointer')}
              role={onPlayerClick ? 'button' : undefined}
              aria-label={
                grade !== undefined
                  ? `${pos.player.name}, grade ${grade}${isTopGraded ? ', top grade' : ''}`
                  : `${pos.player.name}, no grade yet`
              }
              data-player-id={pos.player.id}
              data-grade={grade ?? 'none'}
              data-variant={markerVariant}
              data-top-graded={isTopGraded || undefined}
              style={{ opacity: effectiveOpacity }}
            >
              {isTopGraded && (
                <circle
                  cx={posX}
                  cy={posY}
                  r={radius + 0.9}
                  fill="none"
                  stroke="var(--color-red-100, #eb0000)"
                  strokeWidth={0.5}
                />
              )}
              {isSelected && (
                <circle
                  cx={posX}
                  cy={posY}
                  r={radius + 0.55}
                  fill="none"
                  stroke="white"
                  strokeWidth={0.4}
                  opacity={0.45}
                />
              )}
              {/* Jersey-style circular badge. Fill conveys the grade (red
                  intensity for graded, grey for empty state); shape is a
                  circle to match the PlayerMarker convention. */}
              <circle
                cx={posX}
                cy={posY}
                r={radius}
                fill={fill}
                stroke={stroke}
                strokeWidth={0.3}
                strokeDasharray={strokeDashArray}
              />
              {/* Primary glyph inside the badge is the shirt number. When the
                  player has no shirt number on file we still render an empty
                  circle so the layout doesn't shift. */}
              {pos.player.shirtNumber ? (
                <text
                  x={posX}
                  y={posY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={radius * 0.9}
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  {pos.player.shirtNumber}
                </text>
              ) : null}
              {/* Grade pip — top-right corner of the badge when graded. Keeps
                  the BILD 1-6 number visible without crowding the jersey
                  number that lives inside the badge. */}
              {grade !== undefined ? (
                <g style={{ pointerEvents: 'none' }}>
                  <circle
                    cx={posX + radius * 0.85}
                    cy={posY - radius * 0.85}
                    r={radius * 0.55}
                    fill="rgba(0,0,0,0.7)"
                    stroke="white"
                    strokeWidth={0.18}
                  />
                  <text
                    x={posX + radius * 0.85}
                    y={posY - radius * 0.85}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={radius * 0.75}
                    fontWeight="bold"
                  >
                    {grade}
                  </text>
                </g>
              ) : null}
              {/* Last-name caption below marker. Bumped from 1.8 → 2.6
                  in Wave 6.4.9 to match the proportional jersey-number bump
                  from Wave 6.4.8 so names read cleanly at default viewport
                  sizes. */}
              <text
                x={posX}
                y={posY + radius + 2}
                textAnchor="middle"
                fill="white"
                fontSize="2.6"
                opacity="0.85"
                style={{ pointerEvents: 'none' }}
              >
                {pos.player.name.split(' ').pop()}
              </text>
            </g>
          );
        })}
      </Pitch>
    </div>
  );
}
