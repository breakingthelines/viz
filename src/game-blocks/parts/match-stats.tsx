import { TABULAR, useBlockLayout, useBlockSkin, useBodyFont } from '../skin/index';
import type { GameBlockMatchStatJson } from '../match/types';
import { refName, type GameBlockMatchJson } from './team-league-match-common';
import { SplitBar } from './team-league-match-ui';

/**
 * Team stats side by side: the home figure left, the label between, the away
 * figure right, and one bar under each, home as the red fill and away as the
 * outlined comparator.
 */
export function MatchStatRows({
  stats,
  match,
}: {
  stats: GameBlockMatchStatJson[];
  match?: GameBlockMatchJson;
}) {
  const skin = useBlockSkin();
  const font = useBodyFont();
  const { look } = useBlockLayout();
  const editorial = look === 'editorial';
  const home = refName(match?.home?.team, true);
  const away = refName(match?.away?.team, true);
  return (
    <div role="table" aria-label="Match stats" style={{ ...TABULAR, fontFamily: font }}>
      {home && away ? (
        <div
          role="row"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingBottom: 4,
            fontFamily: skin.fontSans,
            fontSize: 12.5,
            color: 'var(--btl-block-ink-2)',
          }}
        >
          <span role="columnheader">{home}</span>
          <span role="columnheader">{away}</span>
        </div>
      ) : null}
      {stats.map((s, i) => {
        const h = s.home?.value ?? 0;
        const a = s.away?.value ?? 0;
        const both = typeof s.home?.value === 'number' && typeof s.away?.value === 'number';
        return (
          <div
            key={s.key ?? i}
            role="row"
            style={{
              padding: editorial ? '6px 0 7px' : '8px 0 9px',
              borderTop: `1px solid ${i === 0 ? 'var(--btl-block-line-strong)' : 'var(--btl-block-line)'}`,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(40px, auto) minmax(0, 1fr) minmax(40px, auto)',
                alignItems: 'baseline',
                columnGap: 8,
                fontSize: editorial ? 16 : 15,
              }}
            >
              <span role="cell" style={{ fontWeight: 700, color: 'var(--btl-block-ink-1)' }}>
                {s.home?.display || '–'}
              </span>
              <span
                role="rowheader"
                style={{
                  textAlign: 'center',
                  fontFamily: skin.fontSans,
                  fontSize: 12.5,
                  color: 'var(--btl-block-ink-3)',
                }}
              >
                {s.label}
              </span>
              <span
                role="cell"
                style={{ textAlign: 'right', fontWeight: 700, color: 'var(--btl-block-ink-1)' }}
              >
                {s.away?.display || '–'}
              </span>
            </div>
            {both && h + a > 0 ? <SplitBar left={h} right={a} /> : null}
          </div>
        );
      })}
    </div>
  );
}
