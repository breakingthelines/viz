import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame } from '../skin/index';
import { matchFrame, matchHero } from '../parts/match-common';
import { ScorerColumns } from '../parts/match-scorers';
import type { MatchResultDataJson } from './types';

/** Match › Result: the score as the hero, scorers under each side. */
export function MatchResultBlock(props: GameBlockComponentProps<MatchResultDataJson>) {
  const data = props.config.data ?? {};
  const scorers = data.scorers ?? [];
  return (
    <BlockFrame
      {...matchFrame(props, data.match, 'result')}
      hero={matchHero(data.match)}
      aside={scorers.length > 0 ? <ScorerColumns scorers={scorers} /> : null}
    />
  );
}
