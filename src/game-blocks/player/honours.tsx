import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame } from '../skin/index';
import { HonoursRows } from '../parts/team-rows';
import type { GameBlockHonourJson, PlayerHonoursDataJson } from './data';
import { baseFrame } from './shared';

/**
 * Player › Honours (block style): one row per competition, the seasons won
 * and runner-up under it, the count won on the right. Wholly public.
 */
export function winnerCount(data: PlayerHonoursDataJson): number {
  if (typeof data.winnerCount === 'number') return data.winnerCount;
  return (data.honours ?? []).filter((h) => /^winner/i.test(h.place ?? '')).length;
}

function newestFirst(list: GameBlockHonourJson[]): GameBlockHonourJson[] {
  return [...list].sort((a, b) => (b.seasonLabel ?? '').localeCompare(a.seasonLabel ?? ''));
}

export function PlayerHonoursBlock(props: GameBlockComponentProps<PlayerHonoursDataJson>) {
  const honours = newestFirst(props.config.data?.honours ?? []);
  return (
    <BlockFrame {...baseFrame(props, 'honours')} annotate={{ target: '[data-num]' }}>
      {honours.length > 0 ? <HonoursRows honours={honours} /> : null}
    </BlockFrame>
  );
}
