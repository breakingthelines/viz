import type { CSSProperties } from 'react';
import type { GameBlockComponentProps } from '../block-props';
import {
  BlockFrame,
  CrestCell,
  FactRows,
  InFrame,
  LabelCell,
  NameCell,
  Num,
  NumCell,
  Row,
  Rows,
  clubFit,
  clubShort,
  teamCrestSrc,
  useBlockLayout,
  useBlockScale,
  useBlockSkin,
} from '../skin/index';
import {
  RESULT_LETTER,
  formatDay,
  oneDecimal,
  type GameBlockTeamMatchJson,
} from '../parts/team-league-match-common';
import { frameBase } from '../parts/team-league-match-ui';
import type { TeamFormDataJson } from './types';

const POINTS: Record<string, number> = { W: 3, D: 1, L: 0 };

/**
 * Team › Form: points per game over the window and the season as fact rows,
 * then the matches newest first: date, crest, "Nottingham Forest (A)", the
 * score with the club's goals first, and W, D or L. The poster adds the
 * points line: points gathered over the window (red) against the season's
 * rate over the same games (dashed).
 */
export function TeamFormBlock(props: GameBlockComponentProps<TeamFormDataJson>) {
  const { config } = props;
  const data = config.data ?? {};
  const matches = data.matches ?? [];
  const ppg = oneDecimal(data.windowPointsPerGame);
  const season = oneDecimal(data.seasonPointsPerGame);
  return (
    <BlockFrame
      {...frameBase(props, { noun: 'form' })}
      annotate={{ target: '[data-form-row="1"] [data-num]' }}
    >
      <FactRows
        rows={[
          ppg
            ? ([
                `Last ${matches.length}`,
                <>
                  <Num>{ppg}</Num> points per game
                </>,
              ] as const)
            : null,
          season
            ? ([
                'Season',
                <>
                  <Num>{season}</Num> points per game
                </>,
              ] as const)
            : null,
        ]}
      />
      {matches.length > 1 && typeof data.seasonPointsPerGame === 'number' ? (
        <InFrame>
          {({ look }) =>
            look === 'poster' ? (
              <PointsLine matches={matches} seasonRate={data.seasonPointsPerGame!} />
            ) : null
          }
        </InFrame>
      ) : null}
      {matches.length > 0 ? <FormRows matches={matches} /> : null}
    </BlockFrame>
  );
}

function FormRows({ matches }: { matches: GameBlockTeamMatchJson[] }) {
  const { narrow } = useBlockLayout();
  const scale = useBlockScale();
  const cols = `${narrow ? '48px' : `${scale.labelCol}px`} 20px minmax(0, 1fr) 40px 22px`;
  return (
    <div style={{ marginTop: 22, borderTop: '1px solid var(--btl-block-line-strong)' }}>
      <Rows label="Form">
        {matches.map((m, i) => {
          const r = RESULT_LETTER[m.result ?? 'GAME_BLOCK_RESULT_UNSPECIFIED'];
          const venue =
            m.venue === 'GAME_BLOCK_VENUE_AWAY'
              ? 'A'
              : m.venue === 'GAME_BLOCK_VENUE_HOME'
                ? 'H'
                : 'N';
          return (
            <Row
              key={m.gameId || i}
              cols={cols}
              last={i === matches.length - 1}
              data-form-row={String(i)}
            >
              <LabelCell>{formatDay(m.date, { year: false })}</LabelCell>
              <CrestCell src={teamCrestSrc(m.opponent)} />
              <NameCell>
                {clubFit(m.opponent?.name, narrow, 17)}{' '}
                <LabelCell style={{ display: 'inline' }}>({venue})</LabelCell>
              </NameCell>
              <NumCell>{m.score ?? ''}</NumCell>
              <NumCell
                dim={r === 'L'}
                style={r === 'W' ? { color: 'var(--btl-block-subject)' } : undefined}
              >
                {r}
              </NumCell>
            </Row>
          );
        })}
      </Rows>
    </div>
  );
}

/**
 * Points gathered over the window, oldest first, against the season's rate
 * over the same games. The red line ends "4 points"; the dashed one ends
 * "10.5 at 2.1 per game". No 3 point ceiling is drawn.
 */
function PointsLine({
  matches,
  seasonRate,
}: {
  matches: GameBlockTeamMatchJson[];
  seasonRate: number;
}) {
  const { narrow } = useBlockLayout();
  const skin = useBlockSkin();
  const seq = [...matches].reverse();
  const pts = [0];
  for (const m of seq) {
    const r = RESULT_LETTER[m.result ?? 'GAME_BLOCK_RESULT_UNSPECIFIED'];
    pts.push(pts[pts.length - 1]! + (POINTS[r] ?? 0));
  }
  const n = seq.length;
  const total = pts[n]!;
  const pace = seasonRate * n;
  const H = narrow ? 110 : 140;
  const labelW = narrow ? 128 : 150;
  const max = Math.max(total, pace, 1);
  const X = (i: number) => (i / n) * 100;
  const Y = (v: number) => H - (v / max) * H;
  return (
    <div
      data-points-line=""
      role="img"
      aria-label={`${total} points from ${n} games; ${oneDecimal(pace)} at ${oneDecimal(seasonRate)} per game`}
      style={{
        position: 'relative',
        marginTop: 26,
        paddingRight: labelW,
        fontFamily: skin.fontSans,
      }}
    >
      <svg
        viewBox={`0 0 100 ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={H}
        style={{ display: 'block', overflow: 'visible' }}
        aria-hidden
      >
        <polyline
          points={`0,${H} 100,${Y(pace)}`}
          fill="none"
          stroke="var(--btl-block-ink-3)"
          strokeWidth={1.5}
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={pts.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}
          fill="none"
          stroke="var(--btl-block-subject)"
          strokeWidth={2.5}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={0}
          x2={100}
          y1={H}
          y2={H}
          stroke="var(--btl-block-line-strong)"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {pts.map((v, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: 'absolute',
            left: `calc((100% - ${labelW}px) * ${X(i) / 100} - 3.5px)`,
            top: Y(v) - 3.5,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--btl-block-subject)',
          }}
        />
      ))}
      <span style={endLabel(Y(total), labelW)}>
        <Num style={{ fontSize: 13 }}>{total}</Num> points
      </span>
      <span style={{ ...endLabel(Y(pace), labelW), color: 'var(--btl-block-ink-3)' }}>
        <Num style={{ fontSize: 13, color: 'var(--btl-block-ink-2)' }}>{oneDecimal(pace)}</Num> at{' '}
        {oneDecimal(seasonRate)} per game
      </span>
      <div style={{ display: 'flex', marginTop: 6 }} aria-hidden>
        {seq.map((m, i) => (
          <span
            key={m.gameId || i}
            style={{
              flex: 1,
              textAlign: 'right',
              fontSize: 11,
              color: 'var(--btl-block-ink-4)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            {clubShort(m.opponent?.name).slice(0, narrow ? 7 : 14)}
          </span>
        ))}
      </div>
    </div>
  );
  function endLabel(y: number, w: number): CSSProperties {
    return {
      position: 'absolute',
      right: 0,
      width: w - 10,
      top: y - 9,
      fontSize: 13,
      color: 'var(--btl-block-ink-1)',
      whiteSpace: 'nowrap',
    };
  }
}
