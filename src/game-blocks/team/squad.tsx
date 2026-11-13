import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame } from '../skin/index';
import { scopeLine } from '../parts/team-league-match-common';
import { SquadList } from '../parts/team-squad';
import { frameBase } from '../parts/team-league-match-ui';
import type { TeamSquadDataJson } from './types';
import { countLabel } from '#/lib/count';

/** Team › Squad: the squad by position. A list, so no hero. */
export function TeamSquadBlock(props: GameBlockComponentProps<TeamSquadDataJson>) {
  const { config } = props;
  const groups = (config.data?.groups ?? []).filter((g) => (g.players ?? []).length > 0);
  const count = groups.reduce((n, g) => n + (g.players?.length ?? 0), 0);
  return (
    <BlockFrame
      {...frameBase(props, {
        context: scopeLine(config, count ? countLabel(count, 'player') : undefined),
        noun: 'squad',
      })}
      aside={groups.length > 0 ? <SquadList groups={groups} /> : null}
    />
  );
}
