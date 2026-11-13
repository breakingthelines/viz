import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, type BlockHero } from '../skin/index';
import { ordinal, scopeLine } from '../parts/team-league-match-common';
import { pickTeamStat, TeamSeasonStatRows } from '../parts/team-season-stats';
import { frameBase } from '../parts/team-league-match-ui';
import type { TeamSeasonTotalsDataJson } from './types';

/** "Goals conceded" to "goals conceded"; "xG" keeps its case. */
function lowerFirst(label: string): string {
  if (label.length > 1 && label[1] === label[1].toLowerCase()) {
    return label[0].toLowerCase() + label.slice(1);
  }
  return label;
}

/**
 * Team › Season totals: points, results, goals, xG and clean sheets, each
 * ranked in the league. The highlighted stat is the hero with its rank and the
 * league median as short labels.
 */
export function TeamSeasonTotalsBlock(props: GameBlockComponentProps<TeamSeasonTotalsDataJson>) {
  const { config } = props;
  const data = config.data ?? {};
  const stats = data.stats ?? [];
  const n = data.teamCount ?? 0;
  const top = pickTeamStat(stats, config.options.highlight);
  let hero: BlockHero | undefined;
  if (top?.value?.display) {
    hero = {
      figure: top.value.display,
      label: lowerFirst(top.label ?? ''),
      baseline: [
        (top.leagueRank ?? 0) > 0 && n > 0 ? `${ordinal(top.leagueRank!)} of ${n}` : null,
        top.leagueMedian?.display ? `Median ${top.leagueMedian.display}` : null,
      ].filter(Boolean),
    };
  }
  const rest = stats.filter((s) => s !== top);
  return (
    <BlockFrame
      {...frameBase(props, {
        context: scopeLine(config, data.played ? `${data.played} played` : undefined),
        noun: 'season',
      })}
      hero={hero}
      aside={rest.length > 0 ? <TeamSeasonStatRows stats={rest} teamCount={n} /> : null}
    />
  );
}
