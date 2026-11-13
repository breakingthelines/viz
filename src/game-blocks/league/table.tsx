import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame } from '../skin/index';
import { TableNote } from '../parts/league-common';
import { StandingsTable } from '../parts/league-table';
import { frameBase } from '../parts/team-league-match-ui';
import type { LeagueTableDataJson } from './types';

/**
 * League › Table: the rows the view chose (`top_six`, `around` a team, or
 * `full`), the highlighted team as the subject row, and how many of the table
 * are shown.
 */
export function LeagueTableBlock(props: GameBlockComponentProps<LeagueTableDataJson>) {
  const { config } = props;
  const data = config.data ?? {};
  const rows = data.rows ?? [];
  const total = data.totalRows ?? rows.length;
  const context = [config.scope.seasonLabel, data.groupLabel].filter(Boolean).join(', ');
  return (
    <BlockFrame
      {...frameBase(props, { context: context || config.context, noun: 'table' })}
      aside={
        rows.length > 0 ? (
          <>
            <StandingsTable rows={rows} highlightTeamId={config.options.highlight} />
            {total > rows.length ? <TableNote>{`${rows.length} of ${total}`}</TableNote> : null}
          </>
        ) : null
      }
    />
  );
}
