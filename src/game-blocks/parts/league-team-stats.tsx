import type { GameBlockColumnJson, GameBlockTeamStatsRowJson } from '../league/types';
import { BlockGrid, RefName, type GridColumn } from './team-league-match-ui';

/**
 * Chosen stats for every team, sorted by one column (shown strongest), the
 * highlighted team as the subject row. No median row. Past three figure columns, the rest drop out at phone width.
 */
export function TeamStatsTable({
  columns,
  rows,
  sort,
  highlightTeamId,
}: {
  columns: GameBlockColumnJson[];
  rows: GameBlockTeamStatsRowJson[];
  sort?: string;
  highlightTeamId?: string;
}) {
  const sorted = sort || columns[0]?.key;
  const cols: GridColumn[] = [
    { label: '', align: 'right', width: '22px' },
    { label: '', width: 'minmax(0, 1fr)' },
    ...columns.map((c, i) => ({
      label: c.label ?? '',
      strong: c.key === sorted,
      wide: i >= 3 && c.key !== sorted,
    })),
  ];
  return (
    <BlockGrid
      label="Team stats"
      columns={cols}
      rows={rows.map((r, i) => ({
        key: r.team?.id || String(i),
        subject: !!highlightTeamId && r.team?.id === highlightTeamId,
        cells: [
          String(i + 1),
          <RefName value={r.team} short />,
          ...columns.map((_, j) => r.values?.[j]?.display || '–'),
        ],
      }))}
    />
  );
}
