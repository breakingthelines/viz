import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, type BlockHero } from '../skin/index';
import { refName } from '../parts/team-league-match-common';
import { LeaderRows } from '../parts/league-leaders';
import { frameBase } from '../parts/team-league-match-ui';
import type { LeagueLeadersDataJson } from './types';

/**
 * League › Leaders: top scorers, assists or cards. The leader's figure is the
 * hero; the board follows.
 */
export function LeagueLeadersBlock(props: GameBlockComponentProps<LeagueLeadersDataJson>) {
  const { config } = props;
  const data = config.data ?? {};
  const rows = data.rows ?? [];
  const label = data.categoryLabel || data.category || '';
  const lead = rows[0];
  const hero: BlockHero | undefined = lead?.value?.display
    ? {
        figure: lead.value.display,
        label: label.toLowerCase(),
        baseline: [refName(lead.player), refName(lead.team, true)].filter(Boolean),
      }
    : undefined;
  return (
    <BlockFrame
      {...frameBase(props, {
        context: [config.scope.seasonLabel, label].filter(Boolean).join(', ') || config.context,
        noun: 'leaders',
      })}
      hero={hero}
      aside={rows.length > 1 ? <LeaderRows rows={rows.slice(1)} valueLabel={label} /> : null}
    />
  );
}
