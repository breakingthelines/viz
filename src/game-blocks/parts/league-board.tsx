import type { ReactNode } from 'react';
import {
  Bar,
  GatedValue,
  LabelCell,
  NameCell,
  NumCell,
  Row,
  Rows,
  clubShort,
  useBlockLayout,
} from '../skin/index';
import { useGatedCell } from '../values';
import type { GameBlockRefJson } from './team-league-match-common';

/** One row of a stat board: public refs and values, or gated cell keys. */
export interface BoardRow {
  key: string;
  player?: GameBlockRefJson;
  team?: GameBlockRefJson;
  value?: { value?: number; display?: string };
  nameCell?: string;
  teamCell?: string;
  valueCell?: string;
}

function CellOr({ cell, width, children }: { cell?: string; width: number; children: ReactNode }) {
  return cell ? <GatedValue cell={cell} width={width} /> : <>{children}</>;
}

/** A row's number for its bar: the public value, or the resolved cell. */
function useRowValue(r: BoardRow | undefined): number | undefined {
  const read = useGatedCell(r?.valueCell || undefined);
  if (!r?.valueCell) return r?.value?.value;
  return read.state === 'value' ? read.value : undefined;
}

function BoardLine({
  row,
  max,
  cols,
  last,
  narrow,
}: {
  row: BoardRow;
  max: number;
  cols: string;
  last: boolean;
  narrow: boolean;
}) {
  const v = useRowValue(row);
  return (
    <Row cols={cols} last={last} data-board-row="">
      <NameCell>
        <CellOr cell={row.nameCell} width={96}>
          {row.player?.name}
        </CellOr>
      </NameCell>
      {narrow ? null : (
        <LabelCell small>
          <CellOr cell={row.teamCell} width={56}>
            {row.team?.shortName || clubShort(row.team?.name)}
          </CellOr>
        </LabelCell>
      )}
      {typeof v === 'number' && max > 0 ? <Bar frac={v / max} /> : <span />}
      <NumCell>
        <CellOr cell={row.valueCell} width={28}>
          {row.value?.display || '–'}
        </CellOr>
      </NumCell>
    </Row>
  );
}

/**
 * One stat's board, the rankings design: a row per player with the name,
 * the club's short form (wide only), a bar to the leader's value and the
 * value. Paid boards read names, clubs and values from their cells. With no
 * `max`, the first (leading) row's value is the full bar.
 */
export function StatBoard({ rows, max: given }: { rows: BoardRow[]; max?: number }) {
  const { narrow } = useBlockLayout();
  const first = useRowValue(rows[0]);
  const max = given ?? first ?? 0;
  const cols = narrow ? 'minmax(0, 1fr) 60px 34px' : 'minmax(0, 1fr) 110px 200px 40px';
  return (
    <Rows label="Board">
      {rows.map((r, i) => (
        <BoardLine
          key={r.key}
          row={r}
          max={max}
          cols={cols}
          last={i === rows.length - 1}
          narrow={narrow}
        />
      ))}
    </Rows>
  );
}
