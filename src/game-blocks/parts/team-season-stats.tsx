import { BlockScale } from '../skin/index';
import type { GameBlockTeamStatJson } from '../team/types';
import { ordinal, rankToScale } from './team-league-match-common';
import { BlockGrid, ScaleCell, type GridRow } from './team-league-match-ui';

/**
 * A team's season stats, each ranked in its league: the figure, the rank, the
 * league median and the rank on the 0 to 100 scale (the red fill), with the
 * median tick at the league's middle.
 */
export function TeamSeasonStatRows({
  stats,
  teamCount,
}: {
  stats: GameBlockTeamStatJson[];
  teamCount: number;
}) {
  const rows: GridRow[] = stats.map((s) => {
    const ranked = (s.leagueRank ?? 0) > 0 && teamCount > 1;
    return {
      key: s.key ?? s.label ?? '',
      cells: [
        s.label ?? '',
        s.value?.display || '–',
        ranked ? ordinal(s.leagueRank!) : '–',
        s.leagueMedian?.display || '–',
        ranked ? (
          <ScaleCell>
            <BlockScale value={rankToScale(s.leagueRank!, teamCount)} median={50} size="row" />
          </ScaleCell>
        ) : null,
      ],
    };
  });
  return (
    <BlockGrid
      label="Season stats"
      columns={[
        { label: '' },
        { label: 'Total', strong: true },
        { label: 'Rank' },
        { label: 'Median', wide: true },
        { label: '', width: 'auto' },
      ]}
      rows={rows}
    />
  );
}

/** The author's highlight, else the first stat the team leads, else the first. */
export function pickTeamStat(
  stats: GameBlockTeamStatJson[],
  highlight: string | undefined
): GameBlockTeamStatJson | undefined {
  return (
    (highlight ? stats.find((s) => s.key === highlight) : undefined) ??
    stats.find((s) => s.leagueRank === 1) ??
    stats[0]
  );
}
