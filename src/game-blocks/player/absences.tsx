import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, InFrame, LabelCell, NameCell, Row, Rows } from '../skin/index';
import { sentenceCase } from '../parts/team-rows';
import type { GameBlockAbsenceJson, PlayerAbsencesDataJson } from './data';
import { baseFrame, shortDate } from './shared';

/** "12 Sep to 3 Oct 2025", "From 9 Nov 2026", "Late November". */
export function absenceDates(a: GameBlockAbsenceJson): string {
  const from = a.from ? shortDate(a.from) : '';
  const fromYear = a.from ? a.from.slice(0, 4) : '';
  if (a.to) {
    const to = `${shortDate(a.to)} ${a.to.slice(0, 4)}`;
    return from ? `${from}${fromYear !== a.to.slice(0, 4) ? ` ${fromYear}` : ''} to ${to}` : to;
  }
  if (from) {
    const back = a.expectedReturn ? `, back ${a.expectedReturn}` : '';
    return `From ${from} ${fromYear}${back}`;
  }
  return a.expectedReturn ?? '';
}

/** "to 12 Nov, 3 games missed", "ongoing". */
export function absenceAside(a: GameBlockAbsenceJson): string {
  const span = a.to ? `to ${shortDate(a.to)}` : 'ongoing';
  const missed = a.gamesMissed
    ? `, ${a.gamesMissed} ${a.gamesMissed === 1 ? 'game' : 'games'} missed`
    : '';
  return span + missed;
}

/**
 * Player › Absences (block style): newest first, the start date in the label
 * column, the reason, and the span with games missed as a small aside.
 * Wholly public.
 */
export function PlayerAbsencesBlock(props: GameBlockComponentProps<PlayerAbsencesDataJson>) {
  const data = props.config.data ?? {};
  const list = [...(data.absences ?? [])].sort((a, b) =>
    (b.from ?? '').localeCompare(a.from ?? '')
  );
  return (
    <BlockFrame
      {...baseFrame(props, 'absences')}
      annotate={{ target: '[role="row"] [role="cell"]:last-child' }}
    >
      {list.length > 0 ? (
        <InFrame>
          {({ scale }) => (
            <Rows label="Absences">
              {list.map((a, i) => (
                <Row
                  key={`${a.from ?? ''}-${i}`}
                  cols={`${scale.labelCol}px minmax(0, 1fr) auto`}
                  last={i === list.length - 1}
                >
                  <LabelCell>{shortDate(a.from)}</LabelCell>
                  <NameCell>{sentenceCase(a.reason)}</NameCell>
                  <LabelCell small>{absenceAside(a)}</LabelCell>
                </Row>
              ))}
            </Rows>
          )}
        </InFrame>
      ) : null}
    </BlockFrame>
  );
}
