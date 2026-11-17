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
  Section,
  Sections,
  clubFit,
  teamCrestSrc,
} from '../skin/index';
import type { GameBlockRefJson } from '../parts/team-league-match-common';
import { frameBase } from '../parts/team-league-match-ui';
import type { GameBlockRoundJson, GameBlockTieJson, LeagueBracketDataJson } from './types';

/** One side's goals in each leg of a tie, matched by team id or name. */
export function legGoals(tie: GameBlockTieJson, team: GameBlockRefJson | undefined): number[] {
  const same = (a?: GameBlockRefJson) =>
    !!a && !!team && ((!!a.id && a.id === team.id) || (!!a.name && a.name === team.name));
  return (tie.legs ?? []).map((l) =>
    same(l.home?.team) ? (l.home?.score ?? 0) : same(l.away?.team) ? (l.away?.score ?? 0) : 0
  );
}

/**
 * League › Bracket: each round a section, each tie two team rows. A
 * two-legged round heads its figures "Leg 1", "Leg 2" and "Aggregate"; a
 * one-game round "Score". The winner is bold; the loser's figure is ink 3.
 * A tie level after its games (decided on penalties) shows the winner in
 * bold and no invented shoot-out score.
 */
export function LeagueBracketBlock(props: GameBlockComponentProps<LeagueBracketDataJson>) {
  const rounds = (props.config.data?.rounds ?? []).filter((r) => (r.ties ?? []).length > 0);
  return (
    <BlockFrame
      {...frameBase(props, { noun: 'bracket' })}
      annotate={{ target: '[data-tie-winner] [data-tie-total] [data-num]' }}
    >
      {rounds.length > 0 ? (
        <InFrame>
          {({ narrow }) => (
            <Sections>
              {rounds.map((r, i) => (
                <RoundSection key={r.label || i} round={r} narrow={narrow} />
              ))}
            </Sections>
          )}
        </InFrame>
      ) : null}
    </BlockFrame>
  );
}

function RoundSection({ round, narrow }: { round: GameBlockRoundJson; narrow: boolean }) {
  const ties = round.ties ?? [];
  const two = ties.some((t) => (t.legs ?? []).length > 1);
  // "Aggregate" in full at every width: the leg columns give way instead.
  const cols = two
    ? `18px minmax(0, 1fr) ${narrow ? '26px 26px 60px' : '58px 58px 76px'}`
    : '18px minmax(0, 1fr) 48px';
  return (
    <Section heading={round.label}>
      <Rows label={round.label}>
        <Row cols={cols} head>
          <span />
          <span />
          {two ? (
            <>
              <LabelCell small align="right">
                Leg 1
              </LabelCell>
              <LabelCell small align="right">
                Leg 2
              </LabelCell>
              <LabelCell small align="right" style={{ overflow: 'visible' }}>
                Aggregate
              </LabelCell>
            </>
          ) : (
            <LabelCell small align="right">
              Score
            </LabelCell>
          )}
        </Row>
        {ties.map((t, i) => (
          <div
            key={`${t.home?.id}-${t.away?.id}-${i}`}
            style={{
              padding: '5px 0',
              borderBottom: i === ties.length - 1 ? 0 : '1px solid var(--btl-block-line)',
            }}
          >
            <TieSide tie={t} team={t.home} cols={cols} two={two} narrow={narrow} />
            <TieSide tie={t} team={t.away} cols={cols} two={two} narrow={narrow} />
          </div>
        ))}
      </Rows>
    </Section>
  );
}

function TieSide({
  tie,
  team,
  cols,
  two,
  narrow,
}: {
  tie: GameBlockTieJson;
  team: GameBlockRefJson | undefined;
  cols: string;
  two: boolean;
  narrow: boolean;
}) {
  const goals = legGoals(tie, team);
  const decided = !!(tie.winner?.id || tie.winner?.name);
  const won =
    decided &&
    ((!!tie.winner?.id && tie.winner.id === team?.id) ||
      (!!tie.winner?.name && tie.winner.name === team?.name));
  const lost = decided && !won;
  const total = goals.reduce((a, b) => a + b, 0);
  return (
    <Row
      cols={cols}
      last
      style={{ minHeight: narrow ? 28 : 31 }}
      data-tie-winner={won ? '' : undefined}
    >
      <CrestCell src={teamCrestSrc(team)} />
      <NameCell
        style={{
          fontWeight: won ? 700 : 400,
          color: lost ? 'var(--btl-block-ink-3)' : undefined,
        }}
      >
        {clubFit(team?.name, narrow, 18)}
      </NameCell>
      {two ? (
        <>
          <NumCell dim>{goals[0] ?? ''}</NumCell>
          <NumCell dim>{goals[1] ?? ''}</NumCell>
          <span data-tie-total="" style={{ textAlign: 'right' }}>
            <NumCell dim={lost}>{goals.length ? total : ''}</NumCell>
          </span>
        </>
      ) : (
        <span data-tie-total="" style={{ textAlign: 'right' }}>
          <NumCell dim={lost}>{goals[0] ?? ''}</NumCell>
        </span>
      )}
    </Row>
  );
}
