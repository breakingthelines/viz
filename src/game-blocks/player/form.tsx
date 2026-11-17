import type { GameBlockComponentProps } from '../block-props';
import {
  BlockFrame,
  FactRows,
  Num,
  TABULAR,
  clubShort,
  useBlockLayout,
  useBlockSkin,
} from '../skin/index';
import type { GameBlockPlayerMatchJson, PlayerFormDataJson } from './data';
import { baseFrame, RESULT_LETTER, shortDate } from './shared';


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

/**
 * Player › Form (block style): "Average rating" and "Last match" as fact
 * rows, then a column per match, oldest on the left (the last 10, 6 on a
 * narrow block): the rating above a bar on a 5 to 10 scale, red at or above
 * the average, the opponent's short name, the score and his goals and
 * assists ("1G 1A") under it. The average is a dashed line.
 */
export function PlayerFormBlock(props: GameBlockComponentProps<PlayerFormDataJson>) {
  const data = props.config.data ?? {};
  const matches = oldestFirst(data.matches ?? []);
  const avg = data.seasonAverageRating ?? data.windowAverageRating ?? averageRating(matches);
  const last = matches[matches.length - 1];
  return (
    <BlockFrame
      {...baseFrame(props, 'form')}
      annotate={{ target: '[data-form-best] [data-form-rating]' }}
    >
      <FactRows
        rows={[
          typeof avg === 'number'
            ? (['Average rating', <Num>{avg.toFixed(2)}</Num>] as const)
            : null,
          last
            ? ([
                'Last match',
                [shortDate(last.date), last.competitionLabel].filter(Boolean).join(', '),
              ] as const)
            : null,
        ]}
      />
      {matches.length > 0 ? <RatingColumns matches={matches} avg={avg} /> : null}
    </BlockFrame>
  );
}

const LO = 5;
const HI = 10;

function RatingColumns({
  matches: all,
  avg,
}: {
  matches: GameBlockPlayerMatchJson[];
  avg: number | undefined;
}) {
  const { narrow } = useBlockLayout();
  const skin = useBlockSkin();
  const matches = all.slice(-(narrow ? 6 : 10));
  const H = narrow ? 120 : 150;
  const y = (r: number) => H - ((Math.max(LO, Math.min(HI, r)) - LO) / (HI - LO)) * H;
  let best = -1;
  matches.forEach((m, i) => {
    if (typeof m.rating === 'number' && (best < 0 || m.rating >= (matches[best]!.rating ?? 0))) best = i;
  });
  const small = { fontFamily: skin.fontSans, fontSize: 11.5, whiteSpace: 'nowrap' as const };
  return (
    <div
      role="img"
      aria-label={matches.map(matchTitle).join('; ')}
      style={{ position: 'relative', marginTop: 34 }}
    >
      {typeof avg === 'number' ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: y(avg),
            borderTop: '1px dashed var(--btl-block-ink-2)',
          }}
        />
      ) : null}
      <span
        aria-hidden
        style={{ position: 'absolute', left: 0, right: 0, top: H, height: 1, background: 'var(--btl-block-line-strong)' }}
      />
      <div style={{ display: 'flex' }} aria-hidden>
        {matches.map((m, i) => {
          const r = m.rating;
          const has = typeof r === 'number';
          const up = has && typeof avg === 'number' && r! >= avg;
          const ga = [m.goals ? `${m.goals}G` : '', m.assists ? `${m.assists}A` : '']
            .filter(Boolean)
            .join(' ');
          return (
            <div
              key={m.gameId || i}
              data-form-best={i === best ? '' : undefined}
              style={{ flex: 1, minWidth: 0, textAlign: 'center' }}
            >
              <div style={{ position: 'relative', height: H }}>
                {has ? (
                  <>
                    <span
                      data-form-rating=""
                      style={{
                        ...TABULAR,
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: y(r!) - 20,
                        fontFamily: skin.fontSans,
                        fontWeight: 600,
                        fontSize: 12.5,
                        color: 'var(--btl-block-ink-1)',
                      }}
                    >
                      {r!.toFixed(1)}
                    </span>
                    <span
                      style={{
                        position: 'absolute',
                        left: '20%',
                        right: '20%',
                        top: y(r!),
                        bottom: 0,
                        background: up ? 'var(--btl-block-subject)' : 'var(--btl-block-ink-4)',
                      }}
                    />
                  </>
                ) : null}
              </div>
              <div style={{ ...small, marginTop: 6, color: 'var(--btl-block-ink-2)', overflow: 'hidden' }}>
                {(m.opponent?.shortName || clubShort(m.opponent?.name)).slice(0, narrow ? 7 : 11)}
              </div>
              <div style={{ ...TABULAR, ...small, fontSize: 11, color: 'var(--btl-block-ink-4)' }}>
                {m.score ?? ''}
              </div>
              {ga ? (
                <div style={{ ...small, fontSize: 11, color: 'var(--btl-block-ink-2)' }}>{ga}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
