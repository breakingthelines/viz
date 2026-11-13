import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, type BlockHero } from '../skin/index';
import { scopeLine } from '../parts/team-league-match-common';
import { GoalTimingChart, periodShort } from '../parts/team-goal-timing';
import { frameBase } from '../parts/team-league-match-ui';
import type { GameBlockPeriodJson, TeamGoalTimingDataJson } from './types';

/** The period with the most goals scored; the later one on a tie. */
export function peakPeriod(periods: GameBlockPeriodJson[]): GameBlockPeriodJson | undefined {
  let best: GameBlockPeriodJson | undefined;
  for (const p of periods) {
    if ((p.goalsFor ?? 0) > 0 && (!best || (p.goalsFor ?? 0) >= (best.goalsFor ?? 0))) best = p;
  }
  return best;
}

/**
 * Team › Goal timing: goals for and against by 15 minute period this season.
 * The hero is the period they score most in.
 */
export function TeamGoalTimingBlock(props: GameBlockComponentProps<TeamGoalTimingDataJson>) {
  const { config } = props;
  const periods = config.data?.periods ?? [];
  const peak = peakPeriod(periods);
  const hero: BlockHero | undefined = peak
    ? {
        figure: String(peak.goalsFor ?? 0),
        label: `goals scored, minutes ${periodShort(peak.label)}`,
        baseline: [`Conceded ${peak.goalsAgainst ?? 0}`],
      }
    : undefined;
  return (
    <BlockFrame
      {...frameBase(props, { context: scopeLine(config), noun: 'goal-timing' })}
      hero={hero}
      annotate={{ target: '[data-peak]' }}
    >
      {periods.length > 0 ? <GoalTimingChart periods={periods} peak={peak} /> : null}
    </BlockFrame>
  );
}
