import type { GameBlockComponentProps } from '../block-props';
import { Bar, BlockFrame, InFrame, NameCell, NumCell, Row, Rows, Section } from '../skin/index';
import type { GameBlockArchetypeJson, PlayerArchetypesDataJson } from './data';
import { groupLabel } from './percentile-wheel';
import { baseFrame } from './shared';

export function byFit(archetypes: GameBlockArchetypeJson[]): GameBlockArchetypeJson[] {
  return [...archetypes].sort((a, b) => (b.fit ?? -1) - (a.fit ?? -1));
}

/**
 * Player › Archetypes (block style): under "Fit vs Premier League strikers",
 * each archetype he holds, best fit first: its name, a bar to the fit and
 * the fit. Fit is public by policy.
 */
export function PlayerArchetypesBlock(props: GameBlockComponentProps<PlayerArchetypesDataJson>) {
  const data = props.config.data ?? {};
  const list = byFit(data.archetypes ?? []);
  const pools = [...new Set(list.map((a) => a.poolPhrase).filter(Boolean))];
  const pool = pools.length === 1 ? groupLabel(pools[0], undefined) : null;
  return (
    <BlockFrame
      {...baseFrame(props, 'archetypes')}
      annotate={{ target: '[data-archetype-row="0"] [data-num]' }}
    >
      {list.length > 0 ? (
        <InFrame>
          {({ narrow }) => (
            <Section heading={pool ? `Fit ${pool}` : 'Fit'}>
              <Rows label="Archetypes">
                {list.map((a, i) => (
                  <Row
                    key={a.id ?? a.name ?? i}
                    cols={`minmax(0, 1fr) ${narrow ? 120 : 200}px 40px`}
                    last={i === list.length - 1}
                    data-archetype-row={String(i)}
                  >
                    <NameCell>{a.name}</NameCell>
                    {typeof a.fit === 'number' ? <Bar frac={a.fit / 100} /> : <span />}
                    <NumCell>{typeof a.fit === 'number' ? Math.round(a.fit) : '–'}</NumCell>
                  </Row>
                ))}
              </Rows>
            </Section>
          )}
        </InFrame>
      ) : null}
    </BlockFrame>
  );
}
