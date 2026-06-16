import { cn } from '#/lib/utils';

/** How a stat value is formatted + how the comparison bar is split. */
export type MatchStatKind = 'percent' | 'count' | 'decimal';

/** A single comparison row: one metric, both teams' values. */
export interface MatchStatRow {
  /** Stable key (e.g. "possession"). */
  key: string;
  /** Display label (e.g. "Possession"). */
  label: string;
  /** Home team value. */
  home: number;
  /** Away team value. */
  away: number;
  /** Formatting + bar-split mode. Defaults to `count`. */
  kind?: MatchStatKind;
}

export interface MatchStatsTeam {
  name: string;
  shortName?: string;
  /** Marker / bar colour (hex or CSS colour). */
  color?: string;
}

export interface MatchStatsBoardProps {
  homeTeam: MatchStatsTeam;
  awayTeam: MatchStatsTeam;
  stats: MatchStatRow[];
  className?: string;
}

function formatValue(value: number, kind: MatchStatKind): string {
  switch (kind) {
    case 'percent':
      return `${Math.round(value)}%`;
    case 'decimal':
      return value.toFixed(1);
    default:
      return String(Math.round(value));
  }
}

/**
 * Match (game) statistics comparison board: a stacked list of metrics, each
 * with both teams' values and a proportional split bar (home left, away right).
 * Proto-free plain props so the editor's Game Stats block can render it without
 * a game-protos dependency. Read-only — the editor bakes the numbers in.
 */
export function MatchStatsBoard({ homeTeam, awayTeam, stats, className }: MatchStatsBoardProps) {
  const homeColor = homeTeam.color ?? 'var(--color-team-home)';
  const awayColor = awayTeam.color ?? 'rgba(255,255,255,0.45)';

  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
    >
      {/* Team header */}
      <div className="flex items-center justify-between text-[13px] font-semibold text-white">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: homeColor }} />
          {homeTeam.shortName ?? homeTeam.name}
        </span>
        <span className="flex items-center gap-2">
          {awayTeam.shortName ?? awayTeam.name}
          <span className="size-2.5 rounded-full" style={{ backgroundColor: awayColor }} />
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {stats.map((row) => {
          const kind = row.kind ?? 'count';
          const total = row.home + row.away;
          // Split the bar by share of the total; fall back to 50/50 when both
          // sides are zero so the row still reads as a neutral comparison.
          const homePct = total > 0 ? (row.home / total) * 100 : 50;
          const homeWins = row.home > row.away;
          const awayWins = row.away > row.home;

          return (
            <div key={row.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between text-[12px]">
                <span
                  className={cn(
                    'tabular-nums',
                    homeWins ? 'font-semibold text-white' : 'text-white/70'
                  )}
                >
                  {formatValue(row.home, kind)}
                </span>
                <span className="text-[11px] uppercase tracking-wide text-white/50">
                  {row.label}
                </span>
                <span
                  className={cn(
                    'tabular-nums',
                    awayWins ? 'font-semibold text-white' : 'text-white/70'
                  )}
                >
                  {formatValue(row.away, kind)}
                </span>
              </div>
              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${homePct}%`, backgroundColor: homeColor }}
                />
                <div
                  className="h-full flex-1 rounded-full"
                  style={{ backgroundColor: awayColor, opacity: 0.5 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
