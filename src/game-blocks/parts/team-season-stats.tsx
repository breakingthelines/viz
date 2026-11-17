import { BlockScale } from '../skin/index';
import type { GameBlockTeamStatJson } from '../team/types';
import { rankToScale } from './team-league-match-common';
import { BlockGrid, ScaleCell, type GridRow } from './team-league-match-ui';

/**
 * A team's season stats, each ranked in its league: the figure and its place
 * among the clubs as a bar (the red fill). No ordinal, no median.
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
        ranked ? (
          <ScaleCell>
            <BlockScale value={rankToScale(s.leagueRank!, teamCount)} size="row" />
          </ScaleCell>
        ) : null,
      ],
    };
  });
  return (
    <BlockGrid
      label="Season stats"
      columns={[{ label: '' }, { label: 'Total', strong: true }, { label: '', width: 'auto' }]}
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
