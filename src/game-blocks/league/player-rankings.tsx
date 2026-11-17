import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, Section } from '../skin/index';
import { StatBoard } from '../parts/league-board';
import { RankingCategories } from '../parts/league-ranking-categories';
import { frameBase } from '../parts/team-league-match-ui';
import type { LeaguePlayerRankingsDataJson } from './types';

/**
 * League › Player rankings: one stat's board under its name ("Key passes
 * p90, wingers"): name, club, a bar to the leader and the value. On a paid
 * board the rows are gated cells and resolve per viewer. A several-stat
 * ranking (`categories`) draws one small board per stat. No ordinals,
 * medians or pool counts.
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
        {...frameBase(props, { noun: 'rankings' })}
        annotate={{ target: '[data-ranking-category] span:last-child' }}
      >
        <RankingCategories categories={categories} />
      </BlockFrame>
    );
  }
  const rows = data.rows ?? [];
  const metric = data.metricLabel || data.metricKey || '';
  const heading = [data.per90 ? `${metric} p90` : metric, data.groupLabel?.toLowerCase()]
    .filter(Boolean)
    .join(', ');
  return (
    <BlockFrame
      {...frameBase(props, { noun: 'rankings' })}
      annotate={{ target: '[data-board-row] [data-num]' }}
    >
      {rows.length > 0 ? (
        <Section heading={heading}>
          <StatBoard
            rows={rows.map((r, i) => ({ key: r.player?.id || r.nameCell || String(i), ...r }))}
          />
        </Section>
      ) : null}
    </BlockFrame>
  );
}
