import { BlockScale } from '../skin/index';
import type { GameBlockTenureJson } from '../team/types';
import { yearOf } from './team-league-match-common';
import { BlockGrid, RefName, ScaleCell } from './team-league-match-ui';

/** "2019 to now", "2016 to 2019", "2019". */
export function tenureYears(t: GameBlockTenureJson): string {
  const from = yearOf(t.from);
  const to = t.to ? yearOf(t.to) : 'now';
  if (!from) return to === 'now' ? '' : to;
  return from === to ? from : `${from} to ${to}`;
}

/**
 * A manager's spells, newest first: club, years, games and results, and the
 * win rate on the 0 to 100 scale with his career rate as the tick.
 */
export function TenureRows({
  tenures,
  careerWinRate,
}: {
  tenures: GameBlockTenureJson[];
  careerWinRate?: number;
}) {
  return (
    <BlockGrid
      label="Managerial record"
      columns={[
        { label: '' },
        { label: 'Years', align: 'left', wide: true },
        { label: 'P' },
        { label: 'W', wide: true },
        { label: 'D', wide: true },
        { label: 'L', wide: true },
        { label: 'Win %', strong: true },
        { label: '', width: 'auto' },
      ]}
      rows={tenures.map((t, i) => {
        const rate = typeof t.winRate === 'number' ? t.winRate : undefined;
        return {
          key: `${t.team?.id ?? ''}-${t.from ?? i}`,
          subject: !t.to,
          cells: [
            <RefName value={t.team} short />,
            tenureYears(t),
            String(t.played ?? 0),
            String(t.won ?? 0),
            String(t.drawn ?? 0),
            String(t.lost ?? 0),
            rate !== undefined ? String(Math.round(rate)) : '–',
            rate !== undefined ? (
              <ScaleCell>
                <BlockScale value={rate} median={careerWinRate} size="row" />
              </ScaleCell>
            ) : null,
          ],
        };
      })}
    />
  );
}
