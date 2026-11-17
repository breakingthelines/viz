import type { GameBlockComponentProps } from '../block-props';
import {
  BlockFrame,
  InFrame,
  LabelCell,
  NameCell,
  NumCell,
  Row,
  Rows,
  clubFit,
} from '../skin/index';
import type { PlayerMatchLogDataJson } from './data';
import { baseFrame, shortDate } from './shared';

/**
 * Player › Match log (block style): one row per match, newest first (eight
 * at most): the date in the label column, "v Liverpool" or "at Spurs", the
 * score, minutes (wide), goals, assists and rating. Wholly public.
 */
export function PlayerMatchLogBlock(props: GameBlockComponentProps<PlayerMatchLogDataJson>) {
  const data = props.config.data ?? {};
  const matches = [...(data.matches ?? [])]
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, 8);
  return (
    <BlockFrame
      {...baseFrame(props, 'matches')}
      annotate={{ target: '[data-log-row="0"] [data-log-rating] [data-num]' }}
    >
      {matches.length > 0 ? (
        <InFrame>
          {({ narrow, scale }) => {
            const cols = narrow
              ? `48px minmax(0, 1fr) 34px 22px 22px 40px`
              : `${scale.labelCol}px minmax(0, 1fr) 46px 40px 30px 30px 48px`;
            return (
              <Rows label="Match log">
                <Row cols={cols} head>
                  <span />
                  <span />
                  <span />
                  {narrow ? null : (
                    <LabelCell small align="right">
                      Mins
                    </LabelCell>
                  )}
                  <LabelCell small align="right">
                    G
                  </LabelCell>
                  <LabelCell small align="right">
                    A
                  </LabelCell>
                  <LabelCell small align="right">
                    Rating
                  </LabelCell>
                </Row>
                {matches.map((m, i) => (
                  <Row
                    key={m.gameId || i}
                    cols={cols}
                    last={i === matches.length - 1}
                    data-log-row={String(i)}
                  >
                    <LabelCell>{shortDate(m.date)}</LabelCell>
                    <NameCell>
                      {m.venue === 'GAME_BLOCK_VENUE_AWAY' ? 'at ' : 'v '}
                      {clubFit(m.opponent?.name, narrow, 11)}
                    </NameCell>
                    <NumCell dim>{m.score ?? ''}</NumCell>
                    {narrow ? null : <NumCell dim>{m.minutes ?? ''}</NumCell>}
                    <NumCell dim={!m.goals}>{m.goals ?? 0}</NumCell>
                    <NumCell dim={!m.assists}>{m.assists ?? 0}</NumCell>
                    <span data-log-rating="" style={{ textAlign: 'right' }}>
                      <NumCell>{typeof m.rating === 'number' ? m.rating.toFixed(1) : '–'}</NumCell>
                    </span>
                  </Row>
                ))}
              </Rows>
            );
          }}
        </InFrame>
      ) : null}
    </BlockFrame>
  );
}
