import type { GameBlockComponentProps } from '../block-props';
import { PlayerScaleRows } from '../parts/player-scale-rows';
import { BlockFrame, type BlockHero } from '../skin/index';
import type { GameBlockArchetypeJson, PlayerArchetypesDataJson } from './data';
import { groupLabel } from './percentile-wheel';
import { baseFrame, pctOf } from './shared';

/**
 * Player › Archetypes. The archetypes he holds, best fit first, each fit on
 * the 0 to 100 scale. Fit is public by policy. The hero is the best fit.
 */

export function byFit(archetypes: GameBlockArchetypeJson[]): GameBlockArchetypeJson[] {
  return [...archetypes].sort((a, b) => (b.fit ?? -1) - (a.fit ?? -1));
}

export function PlayerArchetypesBlock(props: GameBlockComponentProps<PlayerArchetypesDataJson>) {
  const data = props.config.data ?? {};
  const list = byFit(data.archetypes ?? []);
  const top = list[0];
  const pools = [...new Set(list.map((a) => a.poolPhrase).filter(Boolean))];

  const hero: BlockHero | undefined =
    top && typeof top.fit === 'number'
      ? {
          figure: String(Math.round(top.fit)),
          label: `${top.name ?? ''} fit`,
          baseline: pools.length === 1 ? [groupLabel(pools[0], undefined)] : [],
        }
      : undefined;

  return (
    <BlockFrame
      {...baseFrame(props, 'archetypes')}
      hero={hero}
      annotate={top?.id ? { target: `[data-k="${top.id}"] [data-anchor="figure"]` } : undefined}
    >
      {list.length > 0 ? (
        <PlayerScaleRows
          rows={list.map((a) => ({
            key: a.id ?? a.name ?? '',
            label: a.name ?? '',
            value: pctOf(a.fit),
            cells: [typeof a.fit === 'number' ? String(Math.round(a.fit)) : '–'],
          }))}
          columns={['Fit']}
        />
      ) : null}
    </BlockFrame>
  );
}
