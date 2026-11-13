import type { ReactNode } from 'react';
import { BlockScale, GatedValue } from '../skin/index';
import type { GameBlockRankingRowJson } from '../league/types';
import { useGatedCell } from '../values';
import { ordinal } from './team-league-match-common';
import { BlockGrid, RefName, ScaleCell } from './team-league-match-ui';

/**
 * A row's percentile on the scale, public or gated. A gated row resolves its
 * own cell, so the scale is locked or pending exactly when the cell is.
 */
function RankingScale({ row }: { row: GameBlockRankingRowJson }) {
  const read = useGatedCell(row.percentileCell || undefined);
  if (!row.percentileCell) {
    if (typeof row.percentile !== 'number') return null;
    return <BlockScale value={row.percentile} median={50} size="row" />;
  }
  if (read.state === 'value' && typeof read.value === 'number') {
    return <BlockScale value={read.value} median={50} size="row" />;
  }
  if (read.state === 'no-data') return null;
  return <BlockScale value={0} size="row" state={read.state} />;
}

/** A cell that is public on a free board and a gated cell key on a paid one. */
function Either({ cell, children, width }: { cell?: string; children: ReactNode; width?: number }) {
  if (cell) return <GatedValue cell={cell} width={width} />;
  return <>{children}</>;
}

/**
 * One metric ranked in one position group. Whatever the board gates (names,
 * clubs, values, percentiles) is read from the row's cell keys; nothing here
 * decides what is locked.
 */
export function RankingRows({
  rows,
  valueLabel,
}: {
  rows: GameBlockRankingRowJson[];
  valueLabel: string;
}) {
  return (
    <BlockGrid
      label="Player rankings"
      columns={[
        { label: '', align: 'right', width: '22px' },
        { label: '', width: 'minmax(0, 1fr)' },
        { label: '', align: 'left', wide: true },
        { label: valueLabel, strong: true },
        { label: 'Pct' },
        { label: '', width: 'auto' },
      ]}
      rows={rows.map((r, i) => ({
        key: r.player?.id || r.nameCell || String(i),
        cells: [
          String(r.rank ?? i + 1),
          <Either cell={r.nameCell} width={96}>
            <RefName value={r.player} image={false} />
          </Either>,
          <Either cell={r.teamCell} width={64}>
            <RefName value={r.team} short />
          </Either>,
          <Either cell={r.valueCell} width={28}>
            {r.value?.display || '–'}
          </Either>,
          <Either cell={r.percentileCell} width={24}>
            {typeof r.percentile === 'number' ? ordinal(r.percentile) : '–'}
          </Either>,
          <ScaleCell>
            <RankingScale row={r} />
          </ScaleCell>,
        ],
      }))}
    />
  );
}
