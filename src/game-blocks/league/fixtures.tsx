import { Fragment } from 'react';
import type { GameBlockComponentProps } from '../block-props';
import {
  BlockFrame,
  CrestCell,
  InFrame,
  LabelCell,
  NameCell,
  NumCell,
  Row,
  Rows,
  SectionHeading,
  clubFit,
  teamCrestSrc,
} from '../skin/index';
import {
  isPlayed,
  kickoffParts,
  statusLabel,
  type GameBlockMatchJson,
  type GameBlockMatchStatusJson,
} from '../parts/team-league-match-common';

/** Postponed, cancelled or abandoned: the status stands in for the time. */
function off(status: GameBlockMatchStatusJson | undefined): boolean {
  return (
    status === 'GAME_BLOCK_MATCH_STATUS_POSTPONED' ||
    status === 'GAME_BLOCK_MATCH_STATUS_CANCELLED' ||
    status === 'GAME_BLOCK_MATCH_STATUS_ABANDONED'
  );
}
import { frameBase } from '../parts/team-league-match-ui';
import type { LeagueFixturesDataJson } from './types';

/**
 * "Matchday 10" from a provider round ("Regular Season - 10", "Round 10",
 * "Matchday 10"). Empty for a date-keyed prediction round ("Game Round
 * 2026-11-21"), which is no matchday.
 */
export function matchdayTitle(label: string | undefined): string {
  const l = (label ?? '').trim();
  if (!l || /\d{4}-\d{2}-\d{2}/.test(l) || /^game round/i.test(l)) return '';
  const m = /(?:regular season|round|matchday)\s*-?\s*(\d+)\s*$/i.exec(l);
  return m ? `Matchday ${m[1]}` : '';
}

const DAY_LONG = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const DAY_SHORT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** "Saturday 7 November" (wide), "Sat 7 Nov" (narrow), in UK time. */
export function dayHeading(kickoff: string | undefined, narrow: boolean): string {
  if (!kickoff) return '';
  const d = new Date(kickoff);
  if (Number.isNaN(d.getTime())) return '';
  return (narrow ? DAY_SHORT : DAY_LONG).format(d).replace(',', '').replace('Sept', 'Sep');
}

/**
 * League › Fixtures: one matchday, titled "Matchday 10", grouped by day
 * under a section heading. Each row: home right-aligned, its crest, the score
 * (or the UK kick-off time) centred, the away crest, away left-aligned.
 */
export function LeagueFixturesBlock(props: GameBlockComponentProps<LeagueFixturesDataJson>) {
  const { config } = props;
  const data = config.data ?? {};
  const games = data.games ?? [];
  const base = frameBase(props, { noun: 'fixtures' });
  const matchday = matchdayTitle(data.label);
  const title = config.titleOrigin === 'default' && matchday ? matchday : base.title;
  return (
    <BlockFrame {...base} title={title} annotate={{ target: '[data-fixture-score] [data-num]' }}>
      {games.length > 0 ? (
        <InFrame>{({ narrow }) => <FixtureRows games={games} narrow={narrow} />}</InFrame>
      ) : null}
    </BlockFrame>
  );
}

function FixtureRows({ games, narrow }: { games: GameBlockMatchJson[]; narrow: boolean }) {
  const days: [string, GameBlockMatchJson[]][] = [];
  for (const g of games) {
    const day = dayHeading(g.kickoff, narrow);
    const last = days[days.length - 1];
    if (last && last[0] === day) last[1].push(g);
    else days.push([day, [g]]);
  }
  const cols = narrow
    ? 'minmax(0, 1fr) 16px 44px 16px minmax(0, 1fr)'
    : 'minmax(0, 1fr) 18px 56px 18px minmax(0, 1fr)';
  return (
    <Rows label="Fixtures">
      {days.map(([day, list], di) => (
        <Fragment key={day || di}>
          {day ? (
            <div style={{ marginTop: di === 0 ? 0 : 18 }}>
              <SectionHeading>{day}</SectionHeading>
            </div>
          ) : null}
          {list.map((g, i) => {
            const played = isPlayed(g.status);
            // A played game's 0 is left out of the JSON: read it as 0.
            const score = played ? `${g.home?.score ?? 0}-${g.away?.score ?? 0}` : '';
            return (
              <Row key={g.gameId || i} cols={cols} last={i === list.length - 1}>
                <NameCell align="right">{clubFit(g.home?.team?.name, narrow, 13)}</NameCell>
                <CrestCell src={teamCrestSrc(g.home?.team)} />
                {score ? (
                  <span data-fixture-score="" style={{ textAlign: 'center' }}>
                    <NumCell align="center">{score}</NumCell>
                  </span>
                ) : off(g.status) ? (
                  <LabelCell small align="center" style={{ overflow: 'visible' }}>
                    {statusLabel(g.status)}
                  </LabelCell>
                ) : (
                  <NumCell dim align="center">
                    {kickoffParts(g.kickoff)?.time ?? ''}
                  </NumCell>
                )}
                <CrestCell src={teamCrestSrc(g.away?.team)} />
                <NameCell>{clubFit(g.away?.team?.name, narrow, 13)}</NameCell>
              </Row>
            );
          })}
        </Fragment>
      ))}
    </Rows>
  );
}
