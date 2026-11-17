import type { GameBlockComponentProps } from '../block-props';
import {
  BlockFrame,
  FactRows,
  LabelCell,
  NameCell,
  Num,
  Row,
  Rows,
  clubFit,
  clubName,
  teamCrestSrc,
  useBlockLayout,
} from '../skin/index';
import { formatDay } from '../parts/team-league-match-common';
import { frameBase } from '../parts/team-league-match-ui';
import type { GameBlockTenureJson, ManagerRecordDataJson } from './types';

const DAY = 864e5;

function time(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const t = Date.parse(s.length === 7 ? `${s}-01` : s);
  return Number.isNaN(t) ? undefined : t;
}

/** "2.5 years", "8 months". */
export function tenureLength(from: number, to: number): string {
  const months = Math.round((to - from) / (30.44 * DAY));
  if (months >= 12) return `${(months / 12).toFixed(1).replace(/\.0$/, '')} years`;
  return `${Math.max(1, months)} ${months === 1 ? 'month' : 'months'}`;
}

/** Youth and reserve sides are not a manager's spells. */
function isSenior(t: GameBlockTenureJson): boolean {
  return !/\bU\d{2}\b|\bII\b|reserves/i.test(t.team?.name ?? '');
}

/**
 * Team › Manager record: titled by the manager, the current club's crest as
 * the title art. Club and Since (and the career win rate when the data has
 * it) as fact rows, then each spell, newest first, as a span on one time
 * axis with its length.
 */
export function ManagerRecordBlock(props: GameBlockComponentProps<ManagerRecordDataJson>) {
  const { config } = props;
  const data = config.data ?? {};
  const tenures = (data.tenures ?? []).filter(isSenior);
  const coach = data.coach;
  const subject = config.subject;
  const title =
    config.titleOrigin === 'default' && coach?.name ? coach.name : config.title || subject.name;
  const current = tenures.find((t) => !t.to) ?? tenures[0];
  const crest =
    teamCrestSrc(current?.team) ?? (subject.kind === 'team' ? subject.crestUrl : undefined);
  const now = time(config.source.asOf?.slice(0, 10)) ?? Date.now();
  const rate = data.careerWinRate;
  return (
    <BlockFrame
      {...frameBase(props, {
        noun: 'manager',
        media: crest ? { kind: 'crest', src: crest } : undefined,
      })}
      title={title}
      annotate={{ target: '[data-tenure-row="0"] [data-tenure-span]' }}
    >
      <FactRows
        rows={[
          current?.team?.name ? (['Club', clubName(current.team.name)] as const) : null,
          current?.from && !current.to ? (['Since', formatDay(current.from)] as const) : null,
          typeof rate === 'number'
            ? ([
                'Win rate',
                <>
                  <Num>{Math.round(rate)}%</Num> of games
                </>,
              ] as const)
            : null,
        ]}
      />
      {tenures.length > 0 ? <TenureSpans tenures={tenures} now={now} /> : null}
    </BlockFrame>
  );
}

function TenureSpans({ tenures, now }: { tenures: GameBlockTenureJson[]; now: number }) {
  const { narrow } = useBlockLayout();
  const starts = tenures.map((t) => time(t.from)).filter((t): t is number => t !== undefined);
  if (starts.length === 0) return null;
  const t0 = Math.min(...starts);
  const span = Math.max(DAY, now - t0);
  const at = (t: number) => `${((t - t0) / span) * 100}%`;
  const years: number[] = [];
  for (let y = new Date(t0).getUTCFullYear() + 1; y <= new Date(now).getUTCFullYear(); y++) {
    if (!narrow || y % 2 === 0) years.push(y);
  }
  const cols = `minmax(0, 1fr) ${narrow ? 130 : 330}px ${narrow ? 84 : 92}px`;
  return (
    <div style={{ marginTop: 20, borderTop: '1px solid var(--btl-block-line-strong)' }}>
      <Rows label="Spells">
        {tenures.map((t, i) => {
          const a = time(t.from) ?? t0;
          const z = time(t.to) ?? now;
          return (
            <Row key={`${t.team?.id}-${t.from}`} cols={cols} data-tenure-row={String(i)}>
              <NameCell>{clubFit(t.team?.name, narrow, 14)}</NameCell>
              <span aria-hidden style={{ position: 'relative', height: 10 }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 4.5,
                    height: 1,
                    background: 'var(--btl-block-track)',
                  }}
                />
                <span
                  data-tenure-span=""
                  style={{
                    position: 'absolute',
                    left: at(a),
                    width: `max(3px, ${((z - a) / span) * 100}%)`,
                    top: 1,
                    height: 8,
                    background: t.to ? 'var(--btl-block-ink-4)' : 'var(--btl-block-subject)',
                  }}
                />
              </span>
              <LabelCell align="right">{tenureLength(a, z)}</LabelCell>
            </Row>
          );
        })}
        <Row cols={cols} last style={{ minHeight: 22 }}>
          <span />
          <span aria-hidden style={{ position: 'relative', height: 14 }}>
            {years.map((y) => (
              <LabelCell
                key={y}
                small
                style={{
                  position: 'absolute',
                  left: at(Date.UTC(y, 0, 1)),
                  transform: 'translateX(-50%)',
                  fontSize: 11,
                  color: 'var(--btl-block-ink-4)',
                  overflow: 'visible',
                }}
              >
                {y}
              </LabelCell>
            ))}
          </span>
          <span />
        </Row>
      </Rows>
    </div>
  );
}
