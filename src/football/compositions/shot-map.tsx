import { scaleLinear } from 'd3-scale';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import type { PitchTheme } from '#/football/primitives/pitch';
import type { MatchEvent, PitchCoordinates, ShotEventData } from '#/football/types';
import { ShotOutcome, shotOutcomeName, isShot } from '#/football/types';

/** Shot event type - MatchEvent with shot data */
type ShotMatchEvent = MatchEvent & { eventData: { case: 'shot'; value: ShotEventData } };

export type ShotMapVariant = 'half' | 'full';

export interface ShotMapProps {
  /** Array of shot events to display */
  shots: MatchEvent[];
  /**
   * Pitch variant.
   * - `half` (default): a single attacking half — the standalone shot map.
   * - `full`: the whole pitch, with each team attacking opposite goals. Use
   *   together with `homeTeamId`/`awayTeamId` for the BTL "Shots - Both Teams"
   *   Match Centre layout.
   */
  variant?: ShotMapVariant;
  /** Pitch visual theme. Defaults to `grass`. Pass `dark` for the Match Centre. */
  theme?: PitchTheme;
  /** Additional CSS classes */
  className?: string;
  /** Minimum marker size */
  minSize?: number;
  /** Maximum marker size */
  maxSize?: number;
  /** Whether to show xG values on hover */
  showXgLabels?: boolean;
  /**
   * Id of the home team. When both `homeTeamId` and `awayTeamId` are set,
   * markers are coloured by team (rather than by outcome) and — in the `full`
   * variant — the away team's shots are mirrored so the two teams attack
   * opposite goals.
   */
  homeTeamId?: string;
  /** Id of the away team. See `homeTeamId`. */
  awayTeamId?: string;
  /** Home team marker colour. Defaults to the `--color-team-home` token. */
  homeColor?: string;
  /** Away team marker colour. Defaults to the `--color-team-away` token. */
  awayColor?: string;
  /** Custom color function for shots. Overrides team/outcome colouring. */
  getColor?: (shot: ShotMatchEvent) => string;
  /** Click handler for shots */
  onShotClick?: (shot: ShotMatchEvent) => void;
  /** Selected shot ID */
  selectedShotId?: string;
}

const defaultOutcomeColors: Record<ShotOutcome, string> = {
  [ShotOutcome.UNSPECIFIED]: 'var(--color-marker-shot)',
  [ShotOutcome.GOAL]: 'var(--color-marker-goal)',
  [ShotOutcome.SAVED]: 'var(--color-marker-saved)',
  [ShotOutcome.BLOCKED]: 'var(--color-marker-blocked)',
  [ShotOutcome.MISSED]: 'var(--color-marker-miss)',
  [ShotOutcome.POST]: 'var(--color-marker-shot)',
};

/**
 * Shot map visualization showing shots on a pitch, sized by xG.
 *
 * Two modes:
 * - **Outcome mode** (default): a single half-pitch with shots coloured by
 *   outcome (goal / saved / blocked / miss).
 * - **Both-teams mode**: pass `variant="full"` plus `homeTeamId`/`awayTeamId`
 *   to render the whole pitch with each team's shots coloured by team kit and
 *   attacking opposite goals — the BTL Match Centre "Shots - Both Teams" look.
 *
 * Goals are filled discs; non-goal shots are hollow rings, in both modes.
 */
export function ShotMap({
  shots,
  variant = 'half',
  theme = 'grass',
  className,
  minSize = 1,
  maxSize = 4,
  showXgLabels = false,
  homeTeamId,
  awayTeamId,
  homeColor = 'var(--color-team-home)',
  awayColor = 'var(--color-team-away)',
  getColor,
  onShotClick,
  selectedShotId,
}: ShotMapProps) {
  // Filter to only shot events
  const shotEvents = shots.filter(isShot);

  // Scale xG (0-1) to marker size
  const sizeScale = scaleLinear().domain([0, 1]).range([minSize, maxSize]).clamp(true);

  // Team-coloured mode is active only when both ids are supplied.
  const teamColoured = Boolean(homeTeamId && awayTeamId);

  const isAwayShot = (shot: ShotMatchEvent): boolean =>
    teamColoured && awayTeamId !== undefined && shot.team?.id === awayTeamId;

  const getMarkerColor = (shot: ShotMatchEvent): string => {
    if (getColor) return getColor(shot);
    if (teamColoured) return isAwayShot(shot) ? awayColor : homeColor;
    return defaultOutcomeColors[shot.eventData.value.outcome];
  };

  // In the full-pitch both-teams layout the away side is mirrored so the two
  // teams attack opposite goals (home → right, away → left). Feed coordinates
  // are normalised "attacking right" per the shooting team. Half-pitch mode and
  // outcome mode leave coordinates untouched.
  const placeShot = (shot: ShotMatchEvent): PitchCoordinates | undefined => {
    if (!shot.location) return undefined;
    if (variant === 'full' && teamColoured && isAwayShot(shot)) {
      return { x: 100 - shot.location.x, y: 100 - shot.location.y };
    }
    return shot.location;
  };

  return (
    <div className={cn('relative', className)}>
      <Pitch variant={variant} theme={theme}>
        {shotEvents.map((shot) => {
          const shotData = shot.eventData.value;
          const xg = shotData.xg ?? 0.1;
          const size = sizeScale(xg);
          const isSelected = shot.id === selectedShotId;
          const color = getMarkerColor(shot);
          const isGoal = shotData.outcome === ShotOutcome.GOAL;
          const outcomeName = shotOutcomeName[shotData.outcome];
          const point = placeShot(shot);

          return (
            <g
              key={shot.id}
              onClick={() => onShotClick?.(shot)}
              className={cn('cursor-pointer', onShotClick && 'hover:opacity-80')}
              role={onShotClick ? 'button' : undefined}
              aria-label={`${shot.player?.name ?? 'Unknown'}: ${outcomeName}${xg ? ` (xG: ${xg.toFixed(2)})` : ''}`}
            >
              {/* Selection ring */}
              {isSelected && point && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={size + 0.8}
                  fill="none"
                  stroke="white"
                  strokeWidth="0.3"
                />
              )}

              {/* Shot marker — goals filled, other shots hollow rings */}
              {point && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={size}
                  fill={isGoal ? color : 'transparent'}
                  stroke={color}
                  strokeWidth={isGoal ? 0.2 : 0.4}
                  opacity={isSelected ? 1 : 0.85}
                />
              )}

              {/* xG label */}
              {showXgLabels && xg !== undefined && point && (
                <text
                  x={point.x}
                  y={point.y - size - 1}
                  textAnchor="middle"
                  fill="white"
                  fontSize="2"
                  opacity="0.7"
                >
                  {xg.toFixed(2)}
                </text>
              )}
            </g>
          );
        })}
      </Pitch>
    </div>
  );
}
