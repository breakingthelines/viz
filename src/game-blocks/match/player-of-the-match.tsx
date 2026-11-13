import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, type BlockHero } from '../skin/index';
import { matchFrame } from '../parts/match-common';
import { PlayerOfTheMatchScale } from '../parts/match-player-of-the-match';
import { oneDecimal, refName } from '../parts/team-league-match-common';
import type { MatchPlayerOfTheMatchDataJson } from './types';
import { countLabel } from '#/lib/count';

/**
 * Match › Player of the match: the readers' best graded player (game-service
 * picks him on BTL's 1 to 6 scale, lower better), his grade as the hero and the
 * runner-up as the comparator.
 */
export function MatchPlayerOfTheMatchBlock(
  props: GameBlockComponentProps<MatchPlayerOfTheMatchDataJson>
) {
  const data = props.config.data ?? {};
  const winner = data.winner;
  const runnerUp = data.runnerUp;
  const hero: BlockHero | undefined =
    winner && typeof winner.grade === 'number'
      ? {
          figure: oneDecimal(winner.grade),
          label: refName(winner.player),
          baseline: [
            winner.votes ? countLabel(winner.votes, 'vote') : null,
            runnerUp && typeof runnerUp.grade === 'number'
              ? `Runner-up ${refName(runnerUp.player, true) || refName(runnerUp.player)} ${oneDecimal(runnerUp.grade)}`
              : null,
          ].filter(Boolean),
        }
      : undefined;
  const base = matchFrame(props, data.match, 'player-of-the-match');
  return (
    <BlockFrame
      {...base}
      media={
        winner?.player?.imageUrl
          ? { kind: 'person', src: winner.player.imageUrl, crestSrc: winner.team?.imageUrl }
          : base.media
      }
      hero={hero}
    >
      {winner && typeof winner.grade === 'number' ? (
        <PlayerOfTheMatchScale winner={winner} runnerUp={runnerUp} />
      ) : null}
    </BlockFrame>
  );
}
