import { cn } from '#/lib/utils';
import type { DataSource } from '#/football/types';

export interface DataAttributionProps {
  /** Data source/provider */
  source: DataSource;
  /** Custom provider name (for 'custom' source) */
  customName?: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show as a badge or inline text */
  variant?: 'badge' | 'inline';
}

const sourceLabels: Record<DataSource, string> = {
  statsbomb: 'StatsBomb',
  opta: 'Opta',
  wyscout: 'Wyscout',
  instat: 'InStat',
  skillcorner: 'SkillCorner',
  metrica: 'Metrica Sports',
  custom: 'Custom',
};

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

/**
 * Data attribution badge/text showing the data provider
 */
export function DataAttribution({
  source,
  customName,
  className,
  size = 'sm',
  variant = 'badge',
}: DataAttributionProps) {
  const label = source === 'custom' && customName ? customName : sourceLabels[source];

  if (variant === 'inline') {
    return <span className={cn('text-muted opacity-70', className)}>Data by {label}</span>;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded bg-black/50 text-white/80 font-medium',
        sizeClasses[size],
        className
      )}
    >
      Data by {label}
    </span>
  );
}
