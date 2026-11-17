import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame } from '../skin/index';
import { StrengthRows } from '../parts/league-strength';
import { frameBase } from '../parts/team-league-match-ui';
import type { LeagueStrengthDataJson } from './types';

/**
 * League › League strength: the ladder of leagues by index. Wholly gated: a
 * reader below the plan sees the frame, the ranks and locked rows.
 */
export function LeagueStrengthBlock(props: GameBlockComponentProps<LeagueStrengthDataJson>) {
  const { config } = props;
  const data = config.data ?? {};
  const rows = data.rows ?? [];
  // No pool count ("10 of 52 leagues"): the season alone.
  const context = config.scope.seasonLabel ?? '';
  return (
    <BlockFrame
      {...frameBase(props, { context: context || config.context, noun: 'league-strength' })}
      aside={rows.length > 0 ? <StrengthRows rows={rows} /> : null}
    />
  );
}
