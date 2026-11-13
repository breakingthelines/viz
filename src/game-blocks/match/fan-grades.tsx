import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, type BlockHero } from '../skin/index';
import { matchFrame } from '../parts/match-common';
import { FanGradeSides, hasGrade, topGraded } from '../parts/match-fan-grades';
import { oneDecimal, refName } from '../parts/team-league-match-common';
import type { MatchFanGradesDataJson } from './types';
import { countLabel } from '#/lib/count';

/**
 * Match › Fan grades: BTL reader grades for both line-ups, in formation
 * (`pitch`, the default) or as ranked lists (`list`). Grades are BTL's 1 to 6,
 * lower better: the best (lowest) grade is the hero; each team's average is
 * its baseline. A side no reader graded is left out, header and all.
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
          label: `best grade, ${refName(top.player, true) || refName(top.player)}`,
          baseline: top.votes ? [countLabel(top.votes, 'vote')] : undefined,
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
  ].filter((s) => hasGrade(s.players));
  return (
    <BlockFrame
      {...matchFrame(props, data.match, 'fan-grades')}
      hero={hero}
      aside={sides.length > 0 ? <FanGradeSides sides={sides} view={view} top={top} /> : null}
    />
  );
}
