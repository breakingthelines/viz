import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame } from '../skin/index';
import { HonoursRows } from '../parts/team-rows';
import { frameBase } from '../parts/team-league-match-ui';
import type { TeamHonoursDataJson } from './types';

/** Team › Honours: one row per competition, the seasons won and runner-up, the count won. */
export function TeamHonoursBlock(props: GameBlockComponentProps<TeamHonoursDataJson>) {
  const honours = props.config.data?.honours ?? [];
  return (
    <BlockFrame {...frameBase(props, { noun: 'honours' })} annotate={{ target: '[data-num]' }}>
      {honours.length > 0 ? <HonoursRows honours={honours} /> : null}
    </BlockFrame>
  );
}
