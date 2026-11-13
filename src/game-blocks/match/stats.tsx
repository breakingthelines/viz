import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame } from '../skin/index';
import { matchFrame, matchHero } from '../parts/match-common';
import { MatchStatRows } from '../parts/match-stats';
import type { MatchStatsDataJson } from './types';

/** Match › Match stats: team stats side by side, the score as the hero. */
export function MatchStatsBlock(props: GameBlockComponentProps<MatchStatsDataJson>) {
  const data = props.config.data ?? {};
  const stats = data.stats ?? [];
  return (
    <BlockFrame
      {...matchFrame(props, data.match, 'match-stats')}
      hero={matchHero(data.match)}
      aside={stats.length > 0 ? <MatchStatRows stats={stats} match={data.match} /> : null}
    />
  );
}
