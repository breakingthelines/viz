import { BlockScale } from '../skin/index';
import type { GameBlockLeaderRowJson } from '../league/types';
import { BlockGrid, RefName, ScaleCell } from './team-league-match-ui';

/**
 * A leaders board: rank, player, club and value, each value on the 0 to 100
 * scale against the leader's.
 */
export function LeaderRows({
  rows,
  valueLabel,
}: {
  rows: GameBlockLeaderRowJson[];
  valueLabel: string;
}) {
  const top = Math.max(0, ...rows.map((r) => r.value?.value ?? 0));
  return (
    <BlockGrid
      label="Leaders"
      columns={[
        { label: '', align: 'right', width: '22px' },
        { label: '', width: 'minmax(0, 1fr)' },
        { label: '', align: 'left', wide: true },
        { label: valueLabel, strong: true },
        { label: '', width: 'auto' },
      ]}
      rows={rows.map((r, i) => ({
        key: r.player?.id || String(i),
        cells: [
          String(r.rank ?? i + 1),
          <RefName value={r.player} image={false} />,
          <RefName value={r.team} short />,
          r.value?.display || '–',
          top > 0 && typeof r.value?.value === 'number' ? (
            <ScaleCell>
              <BlockScale value={(r.value.value / top) * 100} size="row" />
            </ScaleCell>
          ) : null,
        ],
      }))}
    />
  );
}
