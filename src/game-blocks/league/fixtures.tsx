import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame } from '../skin/index';
import { FixtureList } from '../parts/league-fixtures';
import { frameBase } from '../parts/team-league-match-ui';
import type { LeagueFixturesDataJson } from './types';

/** League › Fixtures: a matchday or date range, results or upcoming. A list, so no hero. */
export function LeagueFixturesBlock(props: GameBlockComponentProps<LeagueFixturesDataJson>) {
  const { config } = props;
  const data = config.data ?? {};
  const games = data.games ?? [];
  const context = [config.scope.seasonLabel, data.label].filter(Boolean).join(', ');
  return (
    <BlockFrame
      {...frameBase(props, { context: context || config.context, noun: 'fixtures' })}
      aside={games.length > 0 ? <FixtureList games={games} /> : null}
    />
  );
}
