import type { CSSProperties } from 'react';
import { TABULAR, useBlockLayout, useBlockSkin } from '../skin/index';
import type { GameBlockPeriodJson } from '../team/types';

/** "0 to 15" to "0-15". */
export function periodShort(label: string | undefined): string {
  return (label ?? '').replace(/\s+to\s+/g, '-');
}

const FOR: CSSProperties = { background: 'var(--btl-block-subject)' };
const AGAINST: CSSProperties = {
  boxSizing: 'border-box',
  border: '1.5px solid var(--btl-block-comparator)',
};

/**
 * Goals for and against by 15 minute period: a pair of columns per period,
 * scored as the red fill, conceded as the outlined comparator, each with its
 * figure above.
 */
export function GoalTimingChart({
  periods,
  peak,
}: {
  periods: GameBlockPeriodJson[];
  /** The period the hero names: its scored column carries `data-peak` for the annotation. */
  peak?: GameBlockPeriodJson;
}) {
  const skin = useBlockSkin();
  const { narrow } = useBlockLayout();
  const max = Math.max(1, ...periods.flatMap((p) => [p.goalsFor ?? 0, p.goalsAgainst ?? 0]));
  const h = narrow ? 96 : 120;
  const bar = (n: number, style: CSSProperties, kind: string, mark = false) => (
    <span
      data-goal-bar={kind}
      data-peak={mark ? '' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: '50%',
        maxWidth: 22,
        height: h,
      }}
    >
      <span style={{ fontSize: 11.5, color: 'var(--btl-block-ink-2)', marginBottom: 3 }}>{n}</span>
      <span
        style={{ ...style, width: '100%', height: Math.max(n > 0 ? 2 : 0, (n / max) * (h - 18)) }}
      />
    </span>
  );
  const swatch = (style: CSSProperties) => (
    <span style={{ ...style, display: 'inline-block', width: 10, height: 10, marginRight: 6 }} />
  );
  return (
    <div style={{ ...TABULAR, fontFamily: skin.fontSans }}>
      <div
        role="img"
        aria-label={periods
          .map((p) => `${p.label}: ${p.goalsFor ?? 0} scored, ${p.goalsAgainst ?? 0} conceded`)
          .join('; ')}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(1, periods.length)}, minmax(0, 1fr))`,
          columnGap: narrow ? 6 : 12,
          borderBottom: '1px solid var(--btl-block-line-strong)',
        }}
      >
        {periods.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
            {bar(p.goalsFor ?? 0, FOR, 'for', p === peak)}
            {bar(p.goalsAgainst ?? 0, AGAINST, 'against')}
          </div>
        ))}
      </div>
      <div
        aria-hidden
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(1, periods.length)}, minmax(0, 1fr))`,
          columnGap: narrow ? 6 : 12,
          marginTop: 5,
          fontSize: 11.5,
          color: 'var(--btl-block-ink-3)',
          textAlign: 'center',
        }}
      >
        {periods.map((p, i) => (
          <span key={i}>{periodShort(p.label)}</span>
        ))}
      </div>
      <p
        style={{
          margin: '10px 0 0',
          display: 'flex',
          gap: 16,
          fontSize: 12.5,
          color: 'var(--btl-block-ink-2)',
        }}
      >
        <span>
          {swatch(FOR)}
          Scored
        </span>
        <span>
          {swatch(AGAINST)}
          Conceded
        </span>
      </p>
    </div>
  );
}
