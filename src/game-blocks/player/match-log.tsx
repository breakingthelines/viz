import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, BlockRows, type BlockHero } from '../skin/index';
import type { PlayerMatchLogDataJson } from './data';
import { averageRating } from './form';
import { baseFrame, oneDecimal, RESULT_LETTER, shortDate, TwoPart, VENUE_LETTER } from './shared';

/**
 * Player › Match log. One row per match, newest first: opponent and date,
 * result, minutes, goals, assists, rating. Wholly public. The hero is the
 * average rating over the rows shown, against his season average.
 */

export function PlayerMatchLogBlock(props: GameBlockComponentProps<PlayerMatchLogDataJson>) {
  const data = props.config.data ?? {};
  const matches = [...(data.matches ?? [])].sort((a, b) =>
    (b.date ?? '').localeCompare(a.date ?? '')
  );
  const avg = averageRating(matches);
  const rated = matches.some((m) => typeof m.rating === 'number');

  const hero: BlockHero | undefined =
    typeof avg === 'number'
      ? {
          figure: oneDecimal(avg),
          label: `average rating, last ${matches.length}`,
          baseline:
            typeof data.seasonAverageRating === 'number'
              ? [`Season ${oneDecimal(data.seasonAverageRating)}`]
              : [],
        }
      : undefined;

  const rows = matches.map((m, i) => {
    const venue = VENUE_LETTER[m.venue ?? 'GAME_BLOCK_VENUE_UNSPECIFIED'];
    const result = RESULT_LETTER[m.result ?? 'GAME_BLOCK_RESULT_UNSPECIFIED'];
    return {
      key: m.gameId || `${m.date}-${i}`,
      label: (
        <TwoPart
          main={`${m.opponent?.name ?? ''}${venue ? ` (${venue})` : ''}`}
          quiet={shortDate(m.date)}
        />
      ),
      cells: [
        `${result} ${m.score ?? ''}`.trim(),
        String(m.minutes ?? 0),
        String(m.goals ?? 0),
        String(m.assists ?? 0),
        ...(rated ? [typeof m.rating === 'number' ? m.rating.toFixed(1) : '–'] : []),
      ],
    };
  });

  return (
    <BlockFrame
      {...baseFrame(props, 'matches')}
      hero={hero}
      aside={
        rows.length > 0 ? (
          <BlockRows
            columns={['', 'Result', 'Min', 'G', 'A', ...(rated ? ['Rating'] : [])]}
            rows={rows}
          />
        ) : null
      }
    />
  );
}
