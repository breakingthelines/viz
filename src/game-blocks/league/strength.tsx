import type { GameBlockComponentProps } from '../block-props';
import {
  Bar,
  BlockFrame,
  GatedValue,
  NameCell,
  NumCell,
  Row,
  Rows,
  Section,
  useBlockLayout,
} from '../skin/index';
import { useGatedCell } from '../values';
import { frameBase } from '../parts/team-league-match-ui';
import type { GameBlockStrengthRowJson, LeagueStrengthDataJson } from './types';

/**
 * League › League strength: the ladder of leagues by index, under "Index".
 * Each row: the league, a bar to 100 and the index; the block's own league
 * in red, the rest ink 4. Wholly gated: a reader below the plan sees the
 * frame and locked rows.
 */
export function LeagueStrengthBlock(props: GameBlockComponentProps<LeagueStrengthDataJson>) {
  const rows = props.config.data?.rows ?? [];
  const subject = props.config.subject.name;
  return (
    <BlockFrame
      {...frameBase(props, { noun: 'league-strength' })}
      annotate={{ target: '[data-strength-subject] [data-num]' }}
    >
      {rows.length > 0 ? (
        <Section heading="Index">
          <StrengthRows rows={rows} subject={subject} />
        </Section>
      ) : null}
    </BlockFrame>
  );
}

function StrengthRows({ rows, subject }: { rows: GameBlockStrengthRowJson[]; subject: string }) {
  const { narrow } = useBlockLayout();
  const cols = `minmax(0, 1fr) ${narrow ? 110 : 260}px 40px`;
  return (
    <Rows label="League strength">
      {rows.map((r, i) => (
        <StrengthRow
          key={r.leagueCell || i}
          row={r}
          subject={subject}
          cols={cols}
          last={i === rows.length - 1}
        />
      ))}
    </Rows>
  );
}

function StrengthRow({
  row,
  subject,
  cols,
  last,
}: {
  row: GameBlockStrengthRowJson;
  subject: string;
  cols: string;
  last: boolean;
}) {
  const name = useGatedCell(row.leagueCell || undefined);
  const index = useGatedCell(row.indexCell || undefined);
  const mine = name.state === 'value' && !!subject && name.display === subject;
  return (
    <Row cols={cols} last={last} data-strength-subject={mine ? '' : undefined}>
      <NameCell>{row.leagueCell ? <GatedValue cell={row.leagueCell} width={120} /> : '–'}</NameCell>
      {index.state === 'value' && typeof index.value === 'number' ? (
        <Bar frac={index.value / 100} dim={!mine} />
      ) : (
        <span />
      )}
      <NumCell dim={!mine}>
        {row.indexCell ? <GatedValue cell={row.indexCell} width={28} /> : '–'}
      </NumCell>
    </Row>
  );
}
