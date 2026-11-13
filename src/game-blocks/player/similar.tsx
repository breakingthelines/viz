import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, BlockRows, GatedValue } from '../skin/index';
import type { PlayerSimilarDataJson } from './data';
import { baseFrame, TwoPart } from './shared';

/**
 * Player › Similar players. Wholly gated: every name, team and similarity is a
 * cell, so a reader below the plan sees the titled frame with locked rows and
 * the locked note. The scope phrase is the only public label.
 */

export function PlayerSimilarBlock(props: GameBlockComponentProps<PlayerSimilarDataJson>) {
  const data = props.config.data ?? {};
  const rows = (data.rows ?? []).map((r, i) => ({
    key: r.nameCell || `row${i}`,
    label: (
      <TwoPart
        main={r.nameCell ? <GatedValue cell={r.nameCell} width={96} /> : '–'}
        quiet={r.teamCell ? <GatedValue cell={r.teamCell} width={64} /> : undefined}
      />
    ),
    cells: [r.similarityCell ? <GatedValue cell={r.similarityCell} width={28} /> : '–'],
  }));

  return (
    <BlockFrame
      {...baseFrame(props, 'similar')}
      aside={
        <>
          {data.scopePhrase ? (
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--btl-block-ink-3)' }}>
              {data.scopePhrase}
            </p>
          ) : null}
          {rows.length > 0 ? <BlockRows columns={['', 'Similarity']} rows={rows} /> : null}
        </>
      }
    />
  );
}
