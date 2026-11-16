import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, GatedValue } from '../skin/index';
import { TableNote } from '../parts/league-common';
import { RankingRows } from '../parts/league-rankings';
import { RankingCategories } from '../parts/league-ranking-categories';
import { frameBase } from '../parts/team-league-match-ui';
import type { LeaguePlayerRankingsDataJson } from './types';

/**
 * League › Player rankings: one metric within one position group, the group
 * median as the baseline. On a paid board the rows and median are gated cells
 * and resolve per viewer. A several-stat ranking (`categories`) draws one
 * small board per stat instead.
 */
export function LeaguePlayerRankingsBlock(
  props: GameBlockComponentProps<LeaguePlayerRankingsDataJson>
) {
  const { config } = props;
  const data = config.data ?? {};
  const categories = (data.categories ?? []).filter((c) => (c.rows ?? []).length > 0);
  if (categories.length > 1) {
    return (
      <BlockFrame
        {...frameBase(props, { context: '', noun: 'rankings' })}
        aside={<RankingCategories categories={categories} />}
      />
    );
  }
  const rows = data.rows ?? [];
  const metric = data.metricLabel || data.metricKey || '';
  const valueLabel = data.per90 ? 'Per 90' : 'Total';
  const group =
    data.groupLabel && data.memberCount
      ? `${data.memberCount} ${data.groupLabel.toLowerCase()}`
      : data.groupLabel;
  const context = [config.scope.seasonLabel, metric, group].filter(Boolean).join(', ');
  const median = data.medianCell ? (
    <>
      Median <GatedValue cell={data.medianCell} width={28} />
    </>
  ) : data.median?.display ? (
    `Median ${data.median.display}`
  ) : null;
  return (
    <BlockFrame
      {...frameBase(props, { context: context || config.context, noun: 'rankings' })}
      aside={
        rows.length > 0 ? (
          <>
            <RankingRows rows={rows} valueLabel={valueLabel} />
            {median ? <TableNote>{median}</TableNote> : null}
          </>
        ) : null
      }
    />
  );
}
