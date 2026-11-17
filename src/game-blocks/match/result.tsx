import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, QuietLines } from '../skin/index';
import { matchFrame } from '../parts/match-common';
import { ScoreBoard, matchQuietLines } from '../parts/match-board';
import type { MatchResultDataJson } from './types';

/**
 * Match › Result: the score with each side's scorers mirrored under it, then
 * at most two quiet lines (competition and matchday; date and venue).
 */
export function MatchResultBlock(props: GameBlockComponentProps<MatchResultDataJson>) {
  const data = props.config.data ?? {};
  return (
    <BlockFrame {...matchFrame(props, data.match, 'result')}>
      <ScoreBoard match={data.match} scorers={data.scorers ?? []} />
      <QuietLines lines={matchQuietLines(data.match)} />
    </BlockFrame>
  );
}
