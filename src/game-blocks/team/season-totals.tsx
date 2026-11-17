import type { GameBlockComponentProps } from '../block-props';
import {
  Bar,
  BlockFrame,
  FactRows,
  Num,
  NumCell,
  Row,
  Rows,
  Section,
  StatCell,
} from '../skin/index';
import { pickTeamStat } from '../parts/team-season-stats';
import { frameBase } from '../parts/team-league-match-ui';
import type { GameBlockTeamStatJson, TeamSeasonTotalsDataJson } from './types';

const RECORD = ['won', 'drawn', 'lost'];

/**
 * Team › Season totals: the record as one fact row ("4 won, 1 drawn, 2
 * lost"), then each stat under "vs Premier League clubs": the value and a
 * bar for the club's place among the league's clubs (red in the top half).
 * No ordinals, no medians.
 */
export function TeamSeasonTotalsBlock(props: GameBlockComponentProps<TeamSeasonTotalsDataJson>) {
  const { config } = props;
  const data = config.data ?? {};
  const stats = data.stats ?? [];
  const n = data.teamCount ?? 0;
  const record = Object.fromEntries(
    stats.filter((s) => RECORD.includes(s.key ?? '')).map((s) => [s.key, s.value?.display])
  );
  const rows = stats.filter((s) => !RECORD.includes(s.key ?? ''));
  const top = pickTeamStat(rows, config.options.highlight);
  const comp = config.scope.competitionLabel;
  const cols = 'minmax(0, 1fr) 64px minmax(80px, 42%)';
  const hasRecord = RECORD.every((k) => record[k] !== undefined);
  return (
    <BlockFrame
      {...frameBase(props, { noun: 'season' })}
      annotate={top?.key ? { target: `[data-stat="${top.key}"] [data-num]` } : undefined}
    >
      {hasRecord ? (
        <FactRows
          rows={[
            [
              'Record',
              <>
                <Num>{record.won}</Num> won, <Num>{record.drawn}</Num> drawn,{' '}
                <Num>{record.lost}</Num> lost
              </>,
            ],
          ]}
        />
      ) : null}
      {rows.length > 0 ? (
        <div style={{ marginTop: hasRecord ? 22 : 0 }}>
          <Section heading={comp ? `vs ${comp} clubs` : undefined}>
            <Rows label="Season totals">
              {rows.map((s, i) => (
                <StatRow key={s.key || i} stat={s} n={n} cols={cols} last={i === rows.length - 1} />
              ))}
            </Rows>
          </Section>
        </div>
      ) : null}
    </BlockFrame>
  );
}

function StatRow({
  stat,
  n,
  cols,
  last,
}: {
  stat: GameBlockTeamStatJson;
  n: number;
  cols: string;
  last: boolean;
}) {
  const rank = stat.leagueRank ?? 0;
  const ranked = rank > 0 && n > 1;
  const frac = ranked ? (n - rank) / (n - 1) : 0;
  const top = ranked && rank <= n / 2;
  return (
    <Row cols={cols} last={last} data-stat={stat.key}>
      <StatCell>{stat.label}</StatCell>
      <NumCell dim={!top}>{stat.value?.display ?? '–'}</NumCell>
      {ranked ? <Bar frac={frac} dim={!top} /> : <span />}
    </Row>
  );
}
