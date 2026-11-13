import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame } from '../skin/index';
import { TeamStatsTable } from '../parts/league-team-stats';
import { frameBase } from '../parts/team-league-match-ui';
import type { LeagueTeamStatsDataJson } from './types';

/** League › Team stats: the chosen columns for every team, sorted, with the league median. */
export function LeagueTeamStatsBlock(props: GameBlockComponentProps<LeagueTeamStatsDataJson>) {
  const { config } = props;
  const data = config.data ?? {};
  const columns = data.columns ?? [];
  const rows = data.rows ?? [];
  return (
    <BlockFrame
      {...frameBase(props, {
        context: config.scope.seasonLabel || config.context,
        noun: 'team-stats',
      })}
      aside={
        rows.length > 0 ? (
          <TeamStatsTable
            columns={columns}
            rows={rows}
            sort={data.sort}
            highlightTeamId={config.options.highlight}
          />
        ) : null
      }
    />
  );
}
