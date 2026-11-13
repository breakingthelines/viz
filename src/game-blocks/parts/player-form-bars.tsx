import { TABULAR, useBlockLayout, useBlockSkin } from '../skin/index';

/**
 * Match ratings as bars, oldest on the left, with the season average as a
 * level line. Bars at or above the line take the subject fill; the rest are
 * quiet. A match with no rating draws a short dashed stub. Used by Form.
 */

export interface PlayerFormBar {
  key: string;
  /** Under the bar: the opponent's short name. */
  label: string;
  rating: number | null;
  /** Read by screen readers: "Chelsea, 9 Nov, won 2-1, rating 7.8". */
  title: string;
  /** Marks the bar the annotated look rings. */
  best?: boolean;
}

/** The rating scale the bars sit on: from a little under the lowest to 10. */
export function formDomain(ratings: number[], average?: number): [number, number] {
  const all = typeof average === 'number' ? [...ratings, average] : ratings;
  if (all.length === 0) return [5, 10];
  const lo = Math.floor(Math.min(...all) - 0.5);
  return [Math.max(0, Math.min(lo, 6)), 10];
}

export function PlayerFormBars({
  bars,
  average,
  averageLabel,
}: {
  bars: PlayerFormBar[];
  average?: number;
  /** "Season 7.1". */
  averageLabel?: string;
}) {
  const { narrow, density } = useBlockLayout();
  const skin = useBlockSkin();
  const height = density === 'tile' ? 90 : narrow ? 120 : 150;
  const rated = bars.map((b) => b.rating).filter((r): r is number => r !== null);
  const [lo, hi] = formDomain(rated, average);
  const y = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const showValues = bars.length <= 12 && !(narrow && bars.length > 8);
  return (
    <div style={{ ...TABULAR, fontFamily: skin.fontSans }} data-form-bars="">
      <div
        role="list"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          gap: bars.length > 12 ? 2 : 4,
          height,
          borderBottom: '1px solid var(--btl-block-line-strong)',
        }}
      >
        {typeof average === 'number' ? (
          <span
            data-form-average=""
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: `${y(average)}%`,
              borderTop: '1px dashed var(--btl-block-tick)',
              zIndex: 1,
            }}
          >
            {averageLabel ? (
              <span
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 3,
                  fontSize: 11.5,
                  color: 'var(--btl-block-ink-2)',
                }}
              >
                {averageLabel}
              </span>
            ) : null}
          </span>
        ) : null}
        {bars.map((b) => {
          const above = b.rating !== null && (average === undefined || b.rating >= average);
          return (
            <div
              key={b.key}
              role="listitem"
              aria-label={b.title}
              data-form-bar=""
              data-best={b.best ? '' : undefined}
              style={{
                flex: '1 1 0',
                minWidth: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
            >
              {b.rating !== null && showValues ? (
                <span
                  style={{
                    fontSize: 11,
                    lineHeight: 1,
                    marginBottom: 3,
                    color: above ? 'var(--btl-block-ink-1)' : 'var(--btl-block-ink-3)',
                  }}
                >
                  {b.rating.toFixed(1)}
                </span>
              ) : null}
              {b.rating !== null ? (
                <span
                  style={{
                    display: 'block',
                    width: '100%',
                    height: `${Math.max(2, y(b.rating))}%`,
                    borderRadius: 'var(--btl-block-radius)',
                    background: above ? 'var(--btl-block-subject)' : 'var(--btl-block-track)',
                  }}
                />
              ) : (
                <span
                  style={{
                    display: 'block',
                    width: '100%',
                    borderTop: '1px dashed var(--btl-block-locked)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div aria-hidden style={{ display: 'flex', gap: bars.length > 12 ? 2 : 4, marginTop: 5 }}>
        {bars.map((b) => (
          <span
            key={b.key}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              overflow: 'hidden',
              textAlign: 'center',
              fontSize: 10.5,
              color: 'var(--btl-block-ink-3)',
              whiteSpace: 'nowrap',
            }}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
