import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame } from '../skin/index';
import { matchFrame, matchHero } from '../parts/match-common';
import { TimelineRows } from '../parts/match-timeline';
import type { MatchTimelineDataJson } from './types';

/**
 * Match › Timeline: events in order, already filtered to goals, cards or subs
 * by the builder. The score is the hero.
 */
export function MatchTimelineBlock(props: GameBlockComponentProps<MatchTimelineDataJson>) {
  const data = props.config.data ?? {};
  const events = data.events ?? [];
  return (
    <BlockFrame
      {...matchFrame(props, data.match, 'timeline')}
      hero={matchHero(data.match)}
      aside={events.length > 0 ? <TimelineRows events={events} match={data.match} /> : null}
    />
  );
}
