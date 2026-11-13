import { formatDay, type GameBlockTransferJson } from './team-league-match-common';
import { BlockGrid, RefName, SectionLabel } from './team-league-match-ui';

/** The fee as reported, else the move type ("Loan", "Free"). */
export function transferTerms(t: GameBlockTransferJson): string {
  if (t.fee) return t.fee;
  return t.type && t.type !== 'Transfer' ? t.type : '';
}

/** One side of a window: player, the other club, date and fee. */
export function TransferRows({
  rows,
  direction,
}: {
  rows: GameBlockTransferJson[];
  /** Ins show the selling club, outs the buying one. */
  direction: 'in' | 'out';
}) {
  return (
    <BlockGrid
      label={direction === 'in' ? 'Ins' : 'Outs'}
      columns={[
        { label: '' },
        { label: direction === 'in' ? 'From' : 'To', align: 'left' },
        { label: 'Date', wide: true },
        { label: 'Fee', strong: true },
      ]}
      rows={rows.map((t, i) => ({
        key: `${t.player?.id ?? ''}-${i}`,
        cells: [
          <RefName value={t.player} image={false} />,
          <RefName value={direction === 'in' ? t.from : t.to} short />,
          formatDay(t.date, { year: false }),
          transferTerms(t),
        ],
      }))}
    />
  );
}

/** A window's ins then outs, each under its label. */
export function TransferWindow({
  ins,
  outs,
}: {
  ins: GameBlockTransferJson[];
  outs: GameBlockTransferJson[];
}) {
  return (
    <div>
      {ins.length > 0 ? (
        <section>
          <SectionLabel first>Ins</SectionLabel>
          <TransferRows rows={ins} direction="in" />
        </section>
      ) : null}
      {outs.length > 0 ? (
        <section>
          <SectionLabel first={ins.length === 0}>Outs</SectionLabel>
          <TransferRows rows={outs} direction="out" />
        </section>
      ) : null}
    </div>
  );
}
