import { cn } from '#/lib/utils';
import type { PitchCoordinates } from '#/football/types';

export interface PlayerMarkerProps {
  /** Position on the pitch (0-100 scale) */
  position: PitchCoordinates;
  /** Marker size (radius in viewBox units) */
  size?: number;
  /** Marker fill color */
  color?: string;
  /** Marker border color */
  strokeColor?: string;
  /** Player number to display */
  number?: number;
  /** Player name (for tooltip/accessibility) */
  name?: string;
  /** Additional CSS classes for the group */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Whether marker is selected/highlighted */
  selected?: boolean;
  /** Opacity (0-1) */
  opacity?: number;
}

/**
 * Circle marker for player positions on a pitch
 */
export function PlayerMarker({
  position,
  size = 2,
  color = 'var(--color-team-home)',
  strokeColor = 'white',
  number,
  name,
  className,
  onClick,
  selected = false,
  opacity = 1,
}: PlayerMarkerProps) {
  return (
    <g
      className={cn('cursor-pointer transition-transform', className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={name}
      style={{ opacity }}
    >
      {/* Selection ring */}
      {selected && (
        <circle
          cx={position.x}
          cy={position.y}
          r={size + 1}
          fill="none"
          stroke={strokeColor}
          strokeWidth="0.3"
          opacity="0.5"
        />
      )}

      {/* Main marker */}
      <circle
        cx={position.x}
        cy={position.y}
        r={size}
        fill={color}
        stroke={strokeColor}
        strokeWidth="0.3"
      />

      {/* Player number */}
      {number !== undefined && (
        <text
          x={position.x}
          y={position.y}
          textAnchor="middle"
          dominantBaseline="central"
          fill={strokeColor}
          fontSize={size * 0.9}
          fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >
          {number}
        </text>
      )}
    </g>
  );
}
