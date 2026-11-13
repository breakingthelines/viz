import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame } from '../skin/index';
import { KnockoutBracket } from '../parts/league-bracket';
import { frameBase } from '../parts/team-league-match-ui';
import type { LeagueBracketDataJson } from './types';

/** League › Bracket: the knockout rounds from the chosen one. */
export function LeagueBracketBlock(props: GameBlockComponentProps<LeagueBracketDataJson>) {
  const { config } = props;
  const rounds = (config.data?.rounds ?? []).filter((r) => (r.ties ?? []).length > 0);
  return (
    <BlockFrame
      {...frameBase(props, {
        context: config.scope.seasonLabel || config.context,
        noun: 'bracket',
      })}
      aside={rounds.length > 0 ? <KnockoutBracket rounds={rounds} /> : null}
    />
  );
}
