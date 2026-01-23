import { scaleLinear } from 'd3-scale';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import type { ShotEvent, ShotOutcome } from '#/football/types';

export interface ShotMapProps {
  /** Array of shot events to display */
  shots: ShotEvent[];
  /** Additional CSS classes */
  className?: string;
  /** Minimum marker size */
  minSize?: number;
  /** Maximum marker size */
  maxSize?: number;
  /** Whether to show xG values on hover */
  showXgLabels?: boolean;
  /** Custom color function for shots */
  getColor?: (shot: ShotEvent) => string;
  /** Click handler for shots */
  onShotClick?: (shot: ShotEvent) => void;
  /** Selected shot ID */
  selectedShotId?: string;
}

const defaultOutcomeColors: Record<ShotOutcome, string> = {
  goal: 'var(--color-marker-goal)',
  saved: 'var(--color-marker-saved)',
  blocked: 'var(--color-marker-blocked)',
  off_target: 'var(--color-marker-miss)',
  post: 'var(--color-marker-shot)',
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
  // Scale xG (0-1) to marker size
  const sizeScale = scaleLinear().domain([0, 1]).range([minSize, maxSize]).clamp(true);

  const getMarkerColor = (shot: ShotEvent): string => {
    if (getColor) return getColor(shot);
    return defaultOutcomeColors[shot.outcome];
  };

  return (
    <div className={cn('relative', className)}>
      <Pitch variant="half">
        {shots.map((shot) => {
          const size = sizeScale(shot.xg ?? 0.1);
          const isSelected = shot.id === selectedShotId;
          const color = getMarkerColor(shot);

          return (
            <g
              key={shot.id}
              onClick={() => onShotClick?.(shot)}
              className={cn('cursor-pointer', onShotClick && 'hover:opacity-80')}
              role={onShotClick ? 'button' : undefined}
              aria-label={`${shot.player?.name ?? 'Unknown'}: ${shot.outcome}${shot.xg ? ` (xG: ${shot.xg.toFixed(2)})` : ''}`}
            >
              {/* Selection ring */}
              {isSelected && (
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
              <circle
                cx={shot.location.x}
                cy={shot.location.y}
                r={size}
                fill={shot.outcome === 'goal' ? color : 'transparent'}
                stroke={color}
                strokeWidth={shot.outcome === 'goal' ? 0.2 : 0.4}
                opacity={isSelected ? 1 : 0.85}
              />

              {/* xG label */}
              {showXgLabels && shot.xg !== undefined && (
                <text
                  x={shot.location.x}
                  y={shot.location.y - size - 1}
                  textAnchor="middle"
                  fill="white"
                  fontSize="2"
                  opacity="0.7"
                >
                  {shot.xg.toFixed(2)}
                </text>
              )}
            </g>
          );
        })}
      </Pitch>
    </div>
  );
}
