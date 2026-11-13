import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, type BlockHero } from '../skin/index';
import { oneDecimal, scopeLine } from '../parts/team-league-match-common';
import { TeamFormRows } from '../parts/team-form';
import { frameBase } from '../parts/team-league-match-ui';
import type { TeamFormDataJson } from './types';

/**
 * Team › Form: the last 5 to 10 results. The hero is points per game over the
 * window; the season's points per game is its baseline.
 */
export function TeamFormBlock(props: GameBlockComponentProps<TeamFormDataJson>) {
  const { config } = props;
  const data = config.data ?? {};
  const matches = data.matches ?? [];
  const ppg = oneDecimal(data.windowPointsPerGame);
  const season = oneDecimal(data.seasonPointsPerGame);
  const hero: BlockHero | undefined = ppg
    ? {
        figure: ppg,
        label: `points per game, last ${matches.length}`,
        baseline: season ? [`Season ${season}`] : undefined,
      }
    : undefined;
  return (
    <BlockFrame
      {...frameBase(props, { context: scopeLine(config), noun: 'form' })}
      hero={hero}
      aside={matches.length > 0 ? <TeamFormRows matches={matches} /> : null}
    />
  );
}
