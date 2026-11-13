import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, type BlockHero } from '../skin/index';
import { matchFrame } from '../parts/match-common';
import { PredictionRows, type PredictionShare } from '../parts/match-predictions';
import { isPlayed, matchScore, refName } from '../parts/team-league-match-common';
import type { MatchPredictionsDataJson } from './types';

/**
 * Match › Predictions: what BTL readers picked. The most backed outcome is the
 * hero; the most picked score, the reader count and, once played, the result
 * are its short labels.
 */
export function MatchPredictionsBlock(props: GameBlockComponentProps<MatchPredictionsDataJson>) {
  const data = props.config.data ?? {};
  const home = refName(data.match?.home?.team, true) || 'Home';
  const away = refName(data.match?.away?.team, true) || 'Away';
  const shares: PredictionShare[] = [
    { key: 'home', label: `${home} win`, share: data.homeShare },
    { key: 'draw', label: 'Draw', share: data.drawShare },
    { key: 'away', label: `${away} win`, share: data.awayShare },
  ];
  const lead = shares
    .filter((s) => typeof s.share === 'number')
    .sort((a, b) => (b.share ?? 0) - (a.share ?? 0))[0];
  const score = isPlayed(data.match?.status) ? matchScore(data.match) : '';
  const hero: BlockHero | undefined = lead
    ? {
        figure: `${Math.round(lead.share ?? 0)}%`,
        label:
          lead.key === 'draw' ? 'backed a draw' : `backed ${lead.key === 'home' ? home : away}`,
        baseline: [
          data.mostPickedScore
            ? `Most picked ${data.mostPickedScore}${typeof data.mostPickedShare === 'number' ? `, ${Math.round(data.mostPickedShare)}%` : ''}`
            : null,
          data.readerCount ? `${data.readerCount} readers` : null,
          score ? `Result ${score}` : null,
        ].filter(Boolean),
      }
    : undefined;
  return (
    <BlockFrame
      {...matchFrame(props, data.match, 'predictions')}
      hero={hero}
      aside={lead ? <PredictionRows shares={shares} /> : null}
    />
  );
}
