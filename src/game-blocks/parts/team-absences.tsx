import { formatDay, type GameBlockAbsenceJson } from './team-league-match-common';
import { BlockGrid, RefName } from './team-league-match-ui';

/** "Late November", else the end date, else nothing. */
export function absenceReturn(a: GameBlockAbsenceJson): string {
  if (a.expectedReturn) return a.expectedReturn;
  if (a.to) return formatDay(a.to, { year: false });
  return '';
}

/** "Hamstring", or "Ankle, doubtful" when the player may yet play. */
export function absenceReason(a: GameBlockAbsenceJson): string {
  const doubtful = /doubt/i.test(a.status ?? '');
  return [a.reason, doubtful ? 'doubtful' : ''].filter(Boolean).join(', ');
}

/**
 * Players out or doubtful: name, reason (doubtful noted) and the expected
 * return. The return column is optional for a match side's short list.
 */
export function AbsenceRows({
  rows,
  back = true,
  label = 'Absences',
}: {
  rows: GameBlockAbsenceJson[];
  back?: boolean;
  label?: string;
}) {
  return (
    <BlockGrid
      label={label}
      columns={[
        { label: '' },
        { label: 'Reason', align: 'left' },
        ...(back ? [{ label: 'Back' }] : []),
      ]}
      rows={rows.map((a, i) => ({
        key: a.player?.id || String(i),
        cells: [
          <RefName value={a.player} image={false} />,
          absenceReason(a),
          ...(back ? [absenceReturn(a)] : []),
        ],
      }))}
    />
  );
}
