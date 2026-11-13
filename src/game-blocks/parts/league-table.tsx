import type { GameBlockStandingRowJson } from '../league/types';
import { BlockGrid, RefName, ResultStrip } from './team-league-match-ui';

function signed(n: number | undefined): string {
  const v = n ?? 0;
  return v > 0 ? `+${v}` : String(v);
}

/**
 * A league table: rank, team, played, results, goals, goal difference, points
 * and form. The highlighted team is the subject row. Goals and form drop out
 * at phone width.
 */
export function StandingsTable({
  rows,
  highlightTeamId,
}: {
  rows: GameBlockStandingRowJson[];
  highlightTeamId?: string;
}) {
  return (
    <BlockGrid
      label="League table"
      columns={[
        { label: '', align: 'right', width: '22px' },
        { label: '', width: 'minmax(0, 1fr)' },
        { label: 'P' },
        { label: 'W', wide: true },
        { label: 'D', wide: true },
        { label: 'L', wide: true },
        { label: 'GF', wide: true },
        { label: 'GA', wide: true },
        { label: 'GD' },
        { label: 'Pts', strong: true },
        { label: 'Form', align: 'left', width: '96px', wide: true },
      ]}
      rows={rows.map((r, i) => ({
        key: r.team?.id || String(i),
        subject: !!highlightTeamId && r.team?.id === highlightTeamId,
        cells: [
          String(r.rank ?? i + 1),
          <RefName value={r.team} short />,
          String(r.played ?? 0),
          String(r.won ?? 0),
          String(r.drawn ?? 0),
          String(r.lost ?? 0),
          String(r.goalsFor ?? 0),
          String(r.goalsAgainst ?? 0),
          signed(r.goalDifference),
          String(r.points ?? 0),
          r.form ? <ResultStrip results={r.form.split('')} size={14} /> : '',
        ],
      }))}
    />
  );
}
