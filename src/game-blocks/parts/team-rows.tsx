import {
  LabelCell,
  NameCell,
  Row,
  Rows,
  useBlockScale,
  useBlockSkin,
  useWordStyle,
  Num,
} from '../skin/index';
import type { GameBlockAbsenceJson, GameBlockHonourJson } from './team-league-match-common';
import { formatDay } from './team-league-match-common';

/** "injury" to "Injury": a reason or a move type in sentence case. */
export function sentenceCase(s: string | undefined): string {
  const t = (s ?? '').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '';
}

/** A reason, with the status when it is not plain out: "Calf, doubtful". */
export function absenceNote(a: GameBlockAbsenceJson): string {
  const status = a.status && !/^out$/i.test(a.status.trim()) ? a.status.toLowerCase() : '';
  return [sentenceCase(a.reason), status].filter(Boolean).join(', ');
}

/** Absent players: name, then the reason as a small aside. */
export function AbsentRows({ rows, label }: { rows: GameBlockAbsenceJson[]; label: string }) {
  return (
    <Rows label={label}>
      {rows.map((r, i) => (
        <Row key={r.player?.id || i} cols="minmax(0, 1fr) auto" last={i === rows.length - 1}>
          <NameCell>{r.player?.name}</NameCell>
          <LabelCell small>{absenceNote(r)}</LabelCell>
        </Row>
      ))}
    </Rows>
  );
}

/**
 * Honours by competition: the competition, under it "Won 2003/04, 1997/98.
 * Runner-up 2022/23", and the count won on the right.
 */
export function HonoursRows({ honours }: { honours: GameBlockHonourJson[] }) {
  const word = useWordStyle();
  const skin = useBlockSkin();
  const scale = useBlockScale();
  const by = new Map<string, { won: string[]; runnerUp: string[] }>();
  for (const h of honours) {
    const name = h.competition?.name ?? '';
    const g = by.get(name) ?? { won: [], runnerUp: [] };
    (/winner/i.test(h.place ?? '') ? g.won : g.runnerUp).push(h.seasonLabel ?? '');
    by.set(name, g);
  }
  const groups = [...by.entries()];
  return (
    <Rows label="Honours">
      {groups.map(([name, g], i) => (
        <Row
          key={name}
          cols="minmax(0, 1fr) 30px"
          last={i === groups.length - 1}
          style={{ padding: '8px 0' }}
        >
          <span style={{ minWidth: 0 }}>
            <span style={{ ...word, display: 'block' }}>{name}</span>
            <span
              style={{
                display: 'block',
                fontFamily: skin.fontSans,
                fontSize: scale.small,
                color: 'var(--btl-block-ink-3)',
              }}
            >
              {[
                g.won.length ? `Won ${g.won.join(', ')}` : '',
                g.runnerUp.length ? `Runner-up ${g.runnerUp.join(', ')}` : '',
              ]
                .filter(Boolean)
                .join('. ')}
            </span>
          </span>
          <span style={{ textAlign: 'right' }}>
            {g.won.length ? <Num>{g.won.length}</Num> : null}
          </span>
        </Row>
      ))}
    </Rows>
  );
}

/** "2025-07-01" to "1 Jul": a row's date in the label column. */
export function dayMonth(day: string | undefined): string {
  return formatDay(day, { year: false });
}
