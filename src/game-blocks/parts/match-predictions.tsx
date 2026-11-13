import { BlockScale } from '../skin/index';
import { BlockGrid, ScaleCell } from './team-league-match-ui';

export interface PredictionShare {
  key: string;
  label: string;
  share?: number;
}

/** The three outcomes readers picked, each share on the 0 to 100 scale. */
export function PredictionRows({ shares }: { shares: PredictionShare[] }) {
  return (
    <BlockGrid
      label="Reader predictions"
      columns={[{ label: '' }, { label: '', strong: true }, { label: '', width: '160px' }]}
      rows={shares.map((s) => ({
        key: s.key,
        cells: [
          s.label,
          typeof s.share === 'number' ? `${Math.round(s.share)}%` : '–',
          typeof s.share === 'number' ? (
            <ScaleCell width={160}>
              <BlockScale value={s.share} size="row" />
            </ScaleCell>
          ) : null,
        ],
      }))}
    />
  );
}
