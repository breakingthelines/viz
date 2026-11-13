import { BlockScale, GatedValue } from '../skin/index';
import type { GameBlockStrengthRowJson } from '../league/types';
import { useGatedCell } from '../values';
import { BlockGrid, ScaleCell } from './team-league-match-ui';

function IndexScale({ cell }: { cell?: string }) {
  const read = useGatedCell(cell || undefined);
  if (read.state === 'value' && typeof read.value === 'number') {
    return <BlockScale value={read.value} size="row" />;
  }
  if (read.state === 'no-data') return null;
  return <BlockScale value={0} size="row" state={read.state} />;
}

/**
 * The league ladder: rank, league and index (0 to 100, the red fill). Every
 * value but the rank arrives as a cell key and resolves per viewer.
 */
export function StrengthRows({ rows }: { rows: GameBlockStrengthRowJson[] }) {
  return (
    <BlockGrid
      label="League strength"
      columns={[
        { label: '', align: 'right', width: '22px' },
        { label: '', width: 'minmax(0, 1fr)' },
        { label: 'Index', strong: true },
        { label: '', width: 'auto' },
      ]}
      rows={rows.map((r, i) => ({
        key: r.leagueCell || String(i),
        cells: [
          String(r.rank ?? i + 1),
          r.leagueCell ? <GatedValue cell={r.leagueCell} width={120} /> : '–',
          r.indexCell ? <GatedValue cell={r.indexCell} width={28} /> : '–',
          <ScaleCell>
            <IndexScale cell={r.indexCell} />
          </ScaleCell>,
        ],
      }))}
    />
  );
}
