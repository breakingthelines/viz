import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, type BlockHero } from '../skin/index';
import { matchFrame } from '../parts/match-common';
import { FanGradeSides, topGraded } from '../parts/match-fan-grades';
import { oneDecimal, refName } from '../parts/team-league-match-common';
import type { MatchFanGradesDataJson } from './types';

/**
 * Match › Fan grades: BTL reader grades for both line-ups, in formation
 * (`pitch`, the default) or as ranked lists (`list`). The top grade is the
 * hero; each team's average is its baseline.
 */
export function MatchFanGradesBlock(props: GameBlockComponentProps<MatchFanGradesDataJson>) {
  const data = props.config.data ?? {};
  const home = data.home ?? [];
  const away = data.away ?? [];
  const view = props.config.options.view === 'list' ? 'list' : 'pitch';
  const top = topGraded([...home, ...away]);
  const hero: BlockHero | undefined =
    top && typeof top.grade === 'number'
      ? {
          figure: oneDecimal(top.grade),
          label: `top grade, ${refName(top.player, true) || refName(top.player)}`,
          baseline: top.votes ? [`${top.votes} votes`] : undefined,
        }
      : undefined;
  const sides = [
    {
      name: refName(data.match?.home?.team),
      players: home,
      average: data.homeAverage,
      formation: data.homeFormation,
    },
    {
      name: refName(data.match?.away?.team),
      players: away,
      average: data.awayAverage,
      formation: data.awayFormation,
    },
  ].filter((s) => s.players.length > 0);
  return (
    <BlockFrame
      {...matchFrame(props, data.match, 'fan-grades')}
      hero={hero}
      aside={sides.length > 0 ? <FanGradeSides sides={sides} view={view} top={top} /> : null}
    />
  );
}
