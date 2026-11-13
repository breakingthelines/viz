import type { GameBlockComponentMap } from '../block-props';
import { MatchFanGradesBlock } from './fan-grades';
import { MatchMissingPlayersBlock } from './missing-players';
import { MatchPlayerOfTheMatchBlock } from './player-of-the-match';
import { MatchPredictionsBlock } from './predictions';
import { MatchResultBlock } from './result';
import { MatchStatsBlock } from './stats';
import { MatchTimelineBlock } from './timeline';

/** Match block components, keyed by type id. */
export const MATCH_BLOCKS: GameBlockComponentMap = {
  'match-stats': MatchStatsBlock,
  'match-result': MatchResultBlock,
  'match-timeline': MatchTimelineBlock,
  'match-fan-grades': MatchFanGradesBlock,
  'match-player-of-the-match': MatchPlayerOfTheMatchBlock,
  'match-predictions': MatchPredictionsBlock,
  'match-missing-players': MatchMissingPlayersBlock,
};

export {
  MatchFanGradesBlock,
  MatchMissingPlayersBlock,
  MatchPlayerOfTheMatchBlock,
  MatchPredictionsBlock,
  MatchResultBlock,
  MatchStatsBlock,
  MatchTimelineBlock,
};
export type * from './types';
