import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, BlockRows, type BlockHero } from '../skin/index';
import type { GameBlockHonourJson, PlayerHonoursDataJson } from './data';
import { baseFrame, TwoPart } from './shared';

/**
 * Player › Honours. His trophies and placings, newest first. Wholly public.
 * The hero is the count of winners' medals.
 */

export function winnerCount(data: PlayerHonoursDataJson): number {
  if (typeof data.winnerCount === 'number') return data.winnerCount;
  return (data.honours ?? []).filter((h) => /^winner/i.test(h.place ?? '')).length;
}

function newestFirst(list: GameBlockHonourJson[]): GameBlockHonourJson[] {
  return [...list].sort((a, b) => (b.seasonLabel ?? '').localeCompare(a.seasonLabel ?? ''));
}

export function PlayerHonoursBlock(props: GameBlockComponentProps<PlayerHonoursDataJson>) {
  const data = props.config.data ?? {};
  const honours = newestFirst(data.honours ?? []);
  const wins = winnerCount(data);

  const hero: BlockHero | undefined = honours.length
    ? { figure: String(wins), label: wins === 1 ? 'trophy' : 'trophies' }
    : undefined;

  const rows = honours.map((h, i) => ({
    key: `${h.competition?.id ?? h.competition?.name ?? ''}-${h.seasonLabel ?? ''}-${i}`,
    label: <TwoPart main={h.competition?.name ?? ''} quiet={h.seasonLabel} />,
    cells: [h.place || '–'],
  }));

  return (
    <BlockFrame
      {...baseFrame(props, 'honours')}
      context={props.config.subject.subtitle || props.config.context}
      hero={hero}
      aside={rows.length > 0 ? <BlockRows columns={[]} rows={rows} /> : null}
    />
  );
}
