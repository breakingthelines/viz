import type { GameBlockComponentProps } from '../block-props';
import { PlayerFormBars, type PlayerFormBar } from '../parts/player-form-bars';
import { BlockFrame, type BlockHero } from '../skin/index';
import type { GameBlockPlayerMatchJson, PlayerFormDataJson } from './data';
import { baseFrame, oneDecimal, RESULT_LETTER, shortDate } from './shared';

/**
 * Player › Form. Match ratings over his last 5 to 20 games as bars against his
 * season average. Wholly public. The hero is the window's average rating.
 */

/** Oldest first, whatever order the builder sent. */
export function oldestFirst(matches: GameBlockPlayerMatchJson[]): GameBlockPlayerMatchJson[] {
  return [...matches].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}

const RESULT_WORD: Record<string, string> = { W: 'won', D: 'drew', L: 'lost' };

export function matchTitle(m: GameBlockPlayerMatchJson): string {
  const r = RESULT_LETTER[m.result ?? 'GAME_BLOCK_RESULT_UNSPECIFIED'];
  return [
    m.opponent?.name,
    shortDate(m.date),
    r ? `${RESULT_WORD[r]} ${m.score ?? ''}`.trim() : m.score,
    typeof m.rating === 'number' ? `rating ${m.rating.toFixed(1)}` : 'no rating',
  ]
    .filter(Boolean)
    .join(', ');
}

/** Mean of the rated matches, when the builder sent no window average. */
export function averageRating(matches: GameBlockPlayerMatchJson[]): number | undefined {
  const r = matches.map((m) => m.rating).filter((x): x is number => typeof x === 'number');
  return r.length ? r.reduce((a, b) => a + b, 0) / r.length : undefined;
}

export function PlayerFormBlock(props: GameBlockComponentProps<PlayerFormDataJson>) {
  const data = props.config.data ?? {};
  const matches = oldestFirst(data.matches ?? []);
  const windowAvg = data.windowAverageRating ?? averageRating(matches);
  const season = data.seasonAverageRating;
  let bestIdx = -1;
  matches.forEach((m, i) => {
    if (typeof m.rating === 'number' && (bestIdx < 0 || m.rating >= (matches[bestIdx].rating ?? 0)))
      bestIdx = i;
  });
  const bars: PlayerFormBar[] = matches.map((m, i) => ({
    key: m.gameId || `${m.date}-${i}`,
    label: m.opponent?.shortName || (m.opponent?.name ?? '').slice(0, 3),
    rating: typeof m.rating === 'number' ? m.rating : null,
    title: matchTitle(m),
    best: i === bestIdx,
  }));
  const goals = matches.reduce((a, m) => a + (m.goals ?? 0), 0);
  const assists = matches.reduce((a, m) => a + (m.assists ?? 0), 0);

  const hero: BlockHero | undefined =
    typeof windowAvg === 'number'
      ? {
          figure: oneDecimal(windowAvg),
          label: `average rating, last ${matches.length}`,
          baseline: [
            typeof season === 'number' ? `Season ${oneDecimal(season)}` : null,
            `${goals} ${goals === 1 ? 'goal' : 'goals'}`,
            `${assists} ${assists === 1 ? 'assist' : 'assists'}`,
          ].filter(Boolean),
        }
      : undefined;

  return (
    <BlockFrame
      {...baseFrame(props, 'form')}
      hero={hero}
      annotate={bestIdx >= 0 ? { target: '[data-form-bar][data-best]' } : undefined}
    >
      {bars.length > 0 ? <PlayerFormBars bars={bars} average={season} /> : null}
    </BlockFrame>
  );
}
