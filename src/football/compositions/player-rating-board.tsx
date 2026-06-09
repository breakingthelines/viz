import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import type { PitchTheme } from '#/football/primitives/pitch';
import type { Formation, FormationPosition } from '#/football/types';

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
  /** Marker square edge length, in viewBox units. */
  markerSize?: number;
  /** Additional CSS classes for the wrapper. */
  className?: string;
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
 * PlayerRatingBoard renders a formation pitch with per-player **grade boxes**
 * laid out at each lineup slot. Grades follow BTL's 1-6 inverse scale
 * (1 = Excellent, 6 = Poor) and use the GradeBox red-intensity gradient.
 *
 * Tapping a marker invokes onPlayerClick — host wires this to the
 * @breakingthelines/design-system PlayerRatingCard sheet for view + write.
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
  markerSize = 4,
  className,
}: PlayerRatingBoardProps) {
  const half = markerSize / 2;
  const strokeDashArray = markerVariant === 'predicted' ? '0.6 0.4' : undefined;
  const effectiveOpacity = markerVariant === 'predicted' ? 0.6 : 1;

  return (
    <div className={cn('relative', className)} data-slot="player-rating-board">
      <Pitch variant="full" theme={theme}>
        {formation.positions.map((pos) => {
          const grade = grades?.get(pos.player.id);
          const isSelected = pos.player.id === selectedPlayerId;
          const fill =
            grade !== undefined
              ? gradeFill(grade)
              : 'color-mix(in srgb, var(--color-grey-400, #ccc4c4) 25%, transparent)';
          const stroke = grade !== undefined ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)';

          return (
            <g
              key={pos.player.id}
              onClick={() => onPlayerClick?.(pos)}
              className={cn(onPlayerClick && 'cursor-pointer')}
              role={onPlayerClick ? 'button' : undefined}
              aria-label={
                grade !== undefined
                  ? `${pos.player.name}, grade ${grade}`
                  : `${pos.player.name}, no grade yet`
              }
              data-player-id={pos.player.id}
              data-grade={grade ?? 'none'}
              data-variant={markerVariant}
              style={{ opacity: effectiveOpacity }}
            >
              {isSelected && (
                <rect
                  x={pos.position.x - half - 0.6}
                  y={pos.position.y - half - 0.6}
                  width={markerSize + 1.2}
                  height={markerSize + 1.2}
                  fill="none"
                  stroke="white"
                  strokeWidth={0.4}
                  opacity={0.45}
                  rx={0.4}
                />
              )}
              <rect
                x={pos.position.x - half}
                y={pos.position.y - half}
                width={markerSize}
                height={markerSize}
                fill={fill}
                stroke={stroke}
                strokeWidth={0.3}
                strokeDasharray={strokeDashArray}
                rx={0.4}
              />
              {grade !== undefined ? (
                <text
                  x={pos.position.x}
                  y={pos.position.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={markerSize * 0.7}
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  {grade}
                </text>
              ) : null}
              {/* Last-name caption below marker */}
              <text
                x={pos.position.x}
                y={pos.position.y + half + 2}
                textAnchor="middle"
                fill="white"
                fontSize="1.8"
                opacity="0.8"
                style={{ pointerEvents: 'none' }}
              >
                {pos.player.name.split(' ').pop()}
              </text>
            </g>
          );
        })}
      </Pitch>
      <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
        {formation.team.shortName ?? formation.team.name} ({formation.formation})
      </div>
    </div>
  );
}
