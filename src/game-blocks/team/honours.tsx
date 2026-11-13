import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, type BlockHero } from '../skin/index';
import { HonourRows } from '../parts/team-honours';
import { frameBase } from '../parts/team-league-match-ui';
import type { TeamHonoursDataJson } from './types';

/** Team › Honours: trophies by competition. The hero is the count of trophies won. */
export function TeamHonoursBlock(props: GameBlockComponentProps<TeamHonoursDataJson>) {
  const { config } = props;
  const data = config.data ?? {};
  const honours = data.honours ?? [];
  const won = data.winnerCount ?? 0;
  const hero: BlockHero | undefined =
    won > 0 ? { figure: String(won), label: won === 1 ? 'trophy' : 'trophies' } : undefined;
  return (
    <BlockFrame
      {...frameBase(props, { context: config.subject.subtitle || config.context, noun: 'honours' })}
      hero={hero}
      aside={honours.length > 0 ? <HonourRows honours={honours} /> : null}
    />
  );
}
