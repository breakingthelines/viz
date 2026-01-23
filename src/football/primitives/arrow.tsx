import { cn } from '#/lib/utils';
import type { PitchCoordinates } from '#/football/types';

export interface ArrowProps {
  /** Start position (0-100 scale) */
  from: PitchCoordinates;
  /** End position (0-100 scale) */
  to: PitchCoordinates;
  /** Stroke color */
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Whether to show arrowhead */
  showArrowhead?: boolean;
  /** Arrowhead size */
  arrowheadSize?: number;
  /** Line opacity */
  opacity?: number;
  /** Dash array for dashed lines */
  dashArray?: string;
  /** Whether line is curved */
  curved?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Arrow/line component for showing passes, movements, etc.
 */
export function Arrow({
  from,
  to,
  color = 'white',
  strokeWidth = 0.4,
  showArrowhead = true,
  arrowheadSize = 1.5,
  opacity = 0.8,
  dashArray,
  curved = false,
  className,
}: ArrowProps) {
  const markerId = `arrowhead-${Math.random().toString(36).substr(2, 9)}`;

  // Calculate control point for curved lines
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  // Perpendicular offset for curve
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const curveOffset = Math.sqrt(dx * dx + dy * dy) * 0.2;

  // Control point perpendicular to the line
  const controlX = midX - (dy / Math.sqrt(dx * dx + dy * dy)) * curveOffset;
  const controlY = midY + (dx / Math.sqrt(dx * dx + dy * dy)) * curveOffset;

  const pathD = curved
    ? `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`
    : `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

  return (
    <g className={cn(className)} opacity={opacity}>
      {/* Arrowhead marker definition */}
      {showArrowhead && (
        <defs>
          <marker
            id={markerId}
            markerWidth={arrowheadSize}
            markerHeight={arrowheadSize}
            refX={arrowheadSize}
            refY={arrowheadSize / 2}
            orient="auto"
          >
            <polygon
              points={`0 0, ${arrowheadSize} ${arrowheadSize / 2}, 0 ${arrowheadSize}`}
              fill={color}
            />
          </marker>
        </defs>
      )}

      {/* Line/curve */}
      <path
        d={pathD}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={dashArray}
        markerEnd={showArrowhead ? `url(#${markerId})` : undefined}
      />
    </g>
  );
}
