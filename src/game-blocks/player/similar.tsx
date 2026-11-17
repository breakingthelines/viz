import type { GameBlockComponentProps } from '../block-props';
import {
  Bar,
  BlockFrame,
  GatedValue,
  InFrame,
  LabelCell,
  NameCell,
  NumCell,
  Row,
  Rows,
  Section,
} from '../skin/index';
import { useGatedCell } from '../values';
import type { GameBlockSimilarRowJson, PlayerSimilarDataJson } from './data';
import { baseFrame } from './shared';

/**
 * Player › Similar players, list view (block style): under "Most similar,
 * Premier League strikers", one row per player: name, club (wide), a bar to
 * the similarity and the similarity. Wholly gated: a reader below the plan
 * sees locked rows and the note. The Orbit stays the default picture.
 */
export function PlayerSimilarBlock(props: GameBlockComponentProps<PlayerSimilarDataJson>) {
  const data = props.config.data ?? {};
  const rows = data.rows ?? [];
  const heading = data.scopePhrase ? `Most similar, ${data.scopePhrase}` : 'Most similar';
  return (
    <BlockFrame
      {...baseFrame(props, 'similar')}
      annotate={{ target: '[data-similar-row="0"] [data-num]' }}
    >
      {rows.length > 0 ? (
        <InFrame>
          {({ narrow }) => (
            <Section heading={heading}>
              <Rows label="Similar players">
                {rows.map((r, i) => (
                  <SimilarRow
                    key={r.nameCell || i}
                    row={r}
                    index={i}
                    narrow={narrow}
                    last={i === rows.length - 1}
                  />
                ))}
              </Rows>
            </Section>
          )}
        </InFrame>
      ) : null}
    </BlockFrame>
  );
}

function SimilarRow({
  row,
  index,
  narrow,
  last,
}: {
  row: GameBlockSimilarRowJson;
  index: number;
  narrow: boolean;
  last: boolean;
}) {
  const sim = useGatedCell(row.similarityCell || undefined);
  const cols = `minmax(0, 1fr) ${narrow ? '' : '130px '}${narrow ? 90 : 160}px 48px`;
  const v = sim.state === 'value' && typeof sim.value === 'number' ? sim.value : undefined;
  return (
    <Row cols={cols} last={last} data-similar-row={String(index)}>
      <NameCell>{row.nameCell ? <GatedValue cell={row.nameCell} width={96} /> : '–'}</NameCell>
      {narrow ? null : (
        <LabelCell small>
          {row.teamCell ? <GatedValue cell={row.teamCell} width={64} /> : ''}
        </LabelCell>
      )}
      {v !== undefined ? <Bar frac={v / 100} /> : <span />}
      <NumCell>
        {row.similarityCell ? <GatedValue cell={row.similarityCell} width={28} /> : '–'}
      </NumCell>
    </Row>
  );
}
