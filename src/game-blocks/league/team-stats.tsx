import type { GameBlockComponentProps } from '../block-props';
import {
  Bar,
  BlockFrame,
  CrestCell,
  InFrame,
  NameCell,
  NumCell,
  Row,
  Rows,
  Section,
  Sections,
  clubShort,
  teamCrestSrc,
} from '../skin/index';
import { frameBase } from '../parts/team-league-match-ui';
import type {
  GameBlockColumnJson,
  GameBlockTeamStatsRowJson,
  LeagueTeamStatsDataJson,
} from './types';

const TOP = 5;

/** Column labels in words where the data abbreviates ("Pts" is "Points"). */
const WORDS: Record<string, string> = {
  Pts: 'Points',
  GF: 'Goals for',
  GA: 'Goals against',
  GD: 'Goal difference',
  xGA: 'xG against',
  Poss: 'Possession',
  CS: 'Clean sheets',
  W: 'Won',
  D: 'Drawn',
  L: 'Lost',
};
export function columnWords(label: string | undefined): string {
  const l = (label ?? '').trim();
  return WORDS[l] ?? l;
}

/**
 * League › Team stats: what the table does not show, one board per stat,
 * two across on a wide block. Each board: the five best clubs (lowest first
 * where lower is better), crest, short name, a bar against the league's
 * best and the value. No median row.
 */
export function LeagueTeamStatsBlock(props: GameBlockComponentProps<LeagueTeamStatsDataJson>) {
  const data = props.config.data ?? {};
  const columns = data.columns ?? [];
  const rows = data.rows ?? [];
  return (
    <BlockFrame
      {...frameBase(props, { noun: 'team-stats' })}
      annotate={{ target: '[data-stat-board] [data-num]' }}
    >
      {columns.length > 0 && rows.length > 0 ? (
        <InFrame>
          {({ narrow }) => (
            <Sections columns={2}>
              {columns.map((c, j) => (
                <StatBoard key={c.key || j} column={c} index={j} rows={rows} narrow={narrow} />
              ))}
            </Sections>
          )}
        </InFrame>
      ) : null}
    </BlockFrame>
  );
}

function StatBoard({
  column,
  index,
  rows,
  narrow,
}: {
  column: GameBlockColumnJson;
  index: number;
  rows: GameBlockTeamStatsRowJson[];
  narrow: boolean;
}) {
  const valued = rows
    .map((r) => ({ r, v: r.values?.[index]?.value, d: r.values?.[index]?.display }))
    .filter(
      (x): x is { r: GameBlockTeamStatsRowJson; v: number; d: string | undefined } =>
        typeof x.v === 'number'
    );
  if (valued.length === 0) return null;
  const low = !!column.lowerIsBetter;
  const sorted = [...valued].sort((a, b) => (low ? a.v - b.v : b.v - a.v)).slice(0, TOP);
  const best = low ? Math.min(...valued.map((x) => x.v)) : Math.max(...valued.map((x) => x.v));
  const cols = `20px minmax(0, 1fr) ${narrow ? 70 : 80}px 48px`;
  return (
    <Section heading={columnWords(column.label)}>
      <div data-stat-board={column.key}>
        <Rows label={column.label}>
          {sorted.map((x, i) => (
            <Row key={x.r.team?.id || i} cols={cols} last={i === sorted.length - 1}>
              <CrestCell src={teamCrestSrc(x.r.team)} />
              <NameCell>{x.r.team?.shortName || clubShort(x.r.team?.name)}</NameCell>
              <Bar frac={low ? (x.v > 0 ? best / x.v : 1) : best > 0 ? x.v / best : 0} />
              <NumCell>{x.d ?? String(x.v)}</NumCell>
            </Row>
          ))}
        </Rows>
      </div>
    </Section>
  );
}
