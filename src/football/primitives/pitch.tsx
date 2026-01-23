import { cn } from '#/lib/utils';

export type PitchVariant = 'full' | 'half' | 'attacking-third';

export interface PitchProps {
  /** Pitch variant to display */
  variant?: PitchVariant;
  /** Additional CSS classes */
  className?: string;
  /** Pitch line color */
  lineColor?: string;
  /** Pitch grass color */
  grassColor?: string;
  /** Whether to show grass pattern stripes */
  showPattern?: boolean;
  /** Children to render on the pitch (markers, arrows, etc.) */
  children?: React.ReactNode;
}

/**
 * SVG football pitch component
 *
 * Coordinate system:
 * - ViewBox: 0 0 100 100 (full pitch) or 0 0 50 100 (half)
 * - x: 0 = own goal line, 100 = opposition goal line
 * - y: 0 = left touchline, 100 = right touchline
 */
export function Pitch({
  variant = 'full',
  className,
  lineColor = 'var(--color-pitch-lines)',
  grassColor = 'var(--color-pitch-grass)',
  showPattern = true,
  children,
}: PitchProps) {
  const getViewBox = () => {
    switch (variant) {
      case 'half':
        return '50 0 50 100';
      case 'attacking-third':
        return '66.67 0 33.33 100';
      default:
        return '0 0 100 100';
    }
  };

  return (
    <svg
      viewBox={getViewBox()}
      className={cn('w-full h-auto aspect-[3/2]', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect x="0" y="0" width="100" height="100" fill={grassColor} />

      {/* Grass pattern stripes */}
      {showPattern && (
        <g opacity="0.15">
          {[0, 20, 40, 60, 80].map((x) => (
            <rect
              key={x}
              x={x}
              y="0"
              width="10"
              height="100"
              fill="var(--color-pitch-grass-light)"
            />
          ))}
        </g>
      )}

      {/* Pitch markings */}
      <g stroke={lineColor} strokeWidth="0.3" fill="none">
        {/* Pitch outline */}
        <rect x="0" y="0" width="100" height="100" />

        {/* Halfway line */}
        <line x1="50" y1="0" x2="50" y2="100" />

        {/* Center circle */}
        <circle cx="50" cy="50" r="9.15" />
        <circle cx="50" cy="50" r="0.5" fill={lineColor} />

        {/* Left penalty area */}
        <rect x="0" y="21.1" width="16.5" height="57.8" />
        <rect x="0" y="36.8" width="5.5" height="26.4" />
        <circle cx="11" cy="50" r="0.5" fill={lineColor} />
        <path d="M 16.5 40.1 A 9.15 9.15 0 0 1 16.5 59.9" />

        {/* Left goal */}
        <rect x="-2" y="45.2" width="2" height="9.6" strokeWidth="0.2" />

        {/* Right penalty area */}
        <rect x="83.5" y="21.1" width="16.5" height="57.8" />
        <rect x="94.5" y="36.8" width="5.5" height="26.4" />
        <circle cx="89" cy="50" r="0.5" fill={lineColor} />
        <path d="M 83.5 40.1 A 9.15 9.15 0 0 0 83.5 59.9" />

        {/* Right goal */}
        <rect x="100" y="45.2" width="2" height="9.6" strokeWidth="0.2" />

        {/* Corner arcs */}
        <path d="M 0 1 A 1 1 0 0 0 1 0" />
        <path d="M 0 99 A 1 1 0 0 1 1 100" />
        <path d="M 99 0 A 1 1 0 0 0 100 1" />
        <path d="M 99 100 A 1 1 0 0 1 100 99" />
      </g>

      {/* Children (markers, arrows, etc.) */}
      {children}
    </svg>
  );
}
