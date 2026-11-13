import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, BlockRows, type BlockHero } from '../skin/index';
import type { GameBlockAbsenceJson, PlayerAbsencesDataJson } from './data';
import { baseFrame, shortDate } from './shared';

/**
 * Player › Absences. Injuries and suspensions, newest first: reason, dates and
 * games missed. Wholly public. The hero is the games missed in total.
 */

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

export function PlayerAbsencesBlock(props: GameBlockComponentProps<PlayerAbsencesDataJson>) {
  const data = props.config.data ?? {};
  const list = [...(data.absences ?? [])].sort((a, b) =>
    (b.from ?? '').localeCompare(a.from ?? '')
  );
  const missed = list.reduce((n, a) => n + (a.gamesMissed ?? 0), 0);

  const hero: BlockHero | undefined = list.length
    ? {
        figure: String(missed),
        label: missed === 1 ? 'game missed' : 'games missed',
        baseline: [`${list.length} ${list.length === 1 ? 'absence' : 'absences'}`],
      }
    : undefined;

  const rows = list.map((a, i) => ({
    key: `${a.from ?? ''}-${i}`,
    label: (
      <>
        {a.reason || a.status || '–'}
        <span style={{ display: 'block', fontSize: 13, color: 'var(--btl-block-ink-3)' }}>
          {absenceDates(a)}
        </span>
      </>
    ),
    cells: [String(a.gamesMissed ?? 0)],
  }));

  return (
    <BlockFrame
      {...baseFrame(props, 'absences')}
      context={props.config.subject.subtitle || props.config.context}
      hero={hero}
      aside={rows.length > 0 ? <BlockRows columns={['', 'Games']} rows={rows} /> : null}
    />
  );
}
