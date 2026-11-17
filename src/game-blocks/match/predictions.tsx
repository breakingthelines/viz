import type { GameBlockComponentProps } from '../block-props';
import {
  Bar,
  BlockFrame,
  FactRows,
  NameCell,
  Num,
  NumCell,
  Row,
  Rows,
  clubName,
  InFrame,
} from '../skin/index';
import { matchFrame } from '../parts/match-common';
import { isPlayed, matchScore } from '../parts/team-league-match-common';
import type { MatchPredictionsDataJson } from './types';

/**
 * Match › Predictions: what BTL readers picked, each outcome's share drawn
 * against 100, the most backed in red; then the most picked score, the
 * readers and, once played, the result as fact rows.
 */
export function MatchPredictionsBlock(props: GameBlockComponentProps<MatchPredictionsDataJson>) {
  const data = props.config.data ?? {};
  const home = clubName(data.match?.home?.team?.name) || 'Home';
  const away = clubName(data.match?.away?.team?.name) || 'Away';
  const shares = [
    { key: 'home', label: `${home} win`, share: data.homeShare },
    { key: 'draw', label: 'Draw', share: data.drawShare },
    { key: 'away', label: `${away} win`, share: data.awayShare },
  ].filter((s): s is { key: string; label: string; share: number } => typeof s.share === 'number');
  const top = Math.max(...shares.map((s) => s.share), 0);
  const score = isPlayed(data.match?.status) ? matchScore(data.match) : '';
  return (
    <BlockFrame
      {...matchFrame(props, data.match, 'predictions')}
      annotate={{ target: '[data-lead-share] [data-num]' }}
    >
      {shares.length > 0 ? (
        <InFrame>
          {({ narrow }) => (
            <Rows label="Predictions">
              {shares.map((s, i) => {
                const lead = s.share === top;
                return (
                  <Row
                    key={s.key}
                    cols={`minmax(0, 1fr) 48px ${narrow ? 140 : 300}px`}
                    last={i === shares.length - 1}
                    data-lead-share={lead ? '' : undefined}
                  >
                    <NameCell>{s.label}</NameCell>
                    <NumCell dim={!lead}>{`${Math.round(s.share)}%`}</NumCell>
                    <Bar frac={s.share / 100} dim={!lead} />
                  </Row>
                );
              })}
            </Rows>
          )}
        </InFrame>
      ) : null}
      <div style={{ marginTop: 20 }}>
        <FactRows
          rows={[
            data.mostPickedScore
              ? ([
                  'Most picked',
                  <>
                    <Num>{data.mostPickedScore}</Num>
                    {typeof data.mostPickedShare === 'number'
                      ? `, ${Math.round(data.mostPickedShare)}%`
                      : ''}
                  </>,
                ] as const)
              : null,
            data.readerCount
              ? (['Readers', <Num>{data.readerCount.toLocaleString('en-GB')}</Num>] as const)
              : null,
            score ? (['Result', <Num>{score}</Num>] as const) : null,
          ]}
        />
      </div>
    </BlockFrame>
  );
}
