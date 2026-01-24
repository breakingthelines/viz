import { scaleLinear } from 'd3-scale';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import type { MatchEvent, ShotEventData } from '#/football/types';
import { ShotOutcome, shotOutcomeName, isShot } from '#/football/types';

/** Shot event type - MatchEvent with shot data */
type ShotMatchEvent = MatchEvent & { eventData: { case: 'shot'; value: ShotEventData } };

export interface ShotMapProps {
  /** Array of shot events to display */
  shots: MatchEvent[];
  /** Additional CSS classes */
  className?: string;
  /** Minimum marker size */
  minSize?: number;
  /** Maximum marker size */
  maxSize?: number;
  /** Whether to show xG values on hover */
  showXgLabels?: boolean;
  /** Custom color function for shots */
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
 * Shot map visualization showing shots on a half-pitch
 * with markers sized by xG value
 */
export function ShotMap({
  shots,
  className,
  minSize = 1,
  maxSize = 4,
  showXgLabels = false,
  getColor,
  onShotClick,
  selectedShotId,
}: ShotMapProps) {
  // Filter to only shot events
  const shotEvents = shots.filter(isShot);

  // Scale xG (0-1) to marker size
  const sizeScale = scaleLinear().domain([0, 1]).range([minSize, maxSize]).clamp(true);

  const getMarkerColor = (shot: ShotMatchEvent): string => {
    if (getColor) return getColor(shot);
    return defaultOutcomeColors[shot.eventData.value.outcome];
  };

  return (
    <div className={cn('relative', className)}>
      <Pitch variant="half">
        {shotEvents.map((shot) => {
          const shotData = shot.eventData.value;
          const xg = shotData.xg ?? 0.1;
          const size = sizeScale(xg);
          const isSelected = shot.id === selectedShotId;
          const color = getMarkerColor(shot);
          const isGoal = shotData.outcome === ShotOutcome.GOAL;
          const outcomeName = shotOutcomeName[shotData.outcome];

          return (
            <g
              key={shot.id}
              onClick={() => onShotClick?.(shot)}
              className={cn('cursor-pointer', onShotClick && 'hover:opacity-80')}
              role={onShotClick ? 'button' : undefined}
              aria-label={`${shot.player?.name ?? 'Unknown'}: ${outcomeName}${xg ? ` (xG: ${xg.toFixed(2)})` : ''}`}
            >
              {/* Selection ring */}
              {isSelected && shot.location && (
                <circle
                  cx={shot.location.x}
                  cy={shot.location.y}
                  r={size + 0.8}
                  fill="none"
                  stroke="white"
                  strokeWidth="0.3"
                />
              )}

              {/* Shot marker */}
              {shot.location && (
                <circle
                  cx={shot.location.x}
                  cy={shot.location.y}
                  r={size}
                  fill={isGoal ? color : 'transparent'}
                  stroke={color}
                  strokeWidth={isGoal ? 0.2 : 0.4}
                  opacity={isSelected ? 1 : 0.85}
                />
              )}

              {/* xG label */}
              {showXgLabels && xg !== undefined && shot.location && (
                <text
                  x={shot.location.x}
                  y={shot.location.y - size - 1}
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
