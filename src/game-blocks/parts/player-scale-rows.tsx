import type { ReactNode } from 'react';
import { BlockScale, TABULAR, useBlockLayout, useBlockSkin, useBodyFont } from '../skin/index';

/**
 * Rows of 0 to 100 scales: the label and its figures on one line, the scale
 * under them. The subject is the red fill, a comparator the outlined ring, a
 * median the tick (the skin's one visual language). Each row carries
 * `data-k` and its first figure `data-anchor="figure"`, for the annotated
 * look's mark. Used by Comparison and
 * Archetypes; the player page can use it for the same panels.
 */

export interface PlayerScaleRow {
  key: string;
  label: ReactNode;
  /** 0 to 100. Null draws the track dashed. */
  value: number | null;
  comparator?: number | null;
  median?: number;
  /** Right-aligned figures; the first is bold. */
  cells: ReactNode[];
}

export function PlayerScaleRows({
  rows,
  columns,
}: {
  rows: PlayerScaleRow[];
  /** Header labels for the figure columns. Empty for no header. */
  columns?: string[];
}) {
  const { look } = useBlockLayout();
  const skin = useBlockSkin();
  const font = useBodyFont();
  const editorial = look === 'editorial';
  const n = rows[0]?.cells.length ?? columns?.length ?? 0;
  const grid = `minmax(0, 1fr) ${Array.from({ length: n }, () => 'minmax(40px, auto)').join(' ')}`;
  return (
    <div role="table" style={{ ...TABULAR, fontFamily: font }}>
      {columns && columns.length > 0 ? (
        <div
          role="row"
          style={{
            display: 'grid',
            gridTemplateColumns: grid,
            gap: 8,
            paddingBottom: 4,
            fontFamily: skin.fontSans,
            fontSize: 11.5,
            color: 'var(--btl-block-ink-3)',
          }}
        >
          <span role="columnheader" />
          {columns.map((c, i) => (
            <span key={i} role="columnheader" style={{ textAlign: 'right' }}>
              {c}
            </span>
          ))}
        </div>
      ) : null}
      {rows.map((r, i) => (
        <div
          key={r.key}
          role="row"
          data-k={r.key}
          style={{
            padding: editorial ? '5px 0 6px' : '8px 0 9px',
            borderTop: `1px solid ${i === 0 ? 'var(--btl-block-line-strong)' : 'var(--btl-block-line)'}`,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: grid,
              gap: 8,
              alignItems: 'baseline',
              fontSize: editorial ? 15 : 14.5,
              lineHeight: 1.25,
              color: 'var(--btl-block-ink-2)',
            }}
          >
            <span role="rowheader" style={{ minWidth: 0 }}>
              {r.label}
            </span>
            {r.cells.map((c, j) => (
              <span
                key={j}
                role="cell"
                data-anchor={j === 0 ? 'figure' : undefined}
                style={{
                  textAlign: 'right',
                  fontWeight: j === 0 ? 700 : 400,
                  color: j === 0 ? 'var(--btl-block-ink-1)' : 'var(--btl-block-ink-2)',
                }}
              >
                {c}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 5 }}>
            <BlockScale
              size="row"
              value={r.value ?? 0}
              state={r.value === null ? 'locked' : 'value'}
              median={r.median}
              comparator={r.comparator ?? undefined}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A key for a two-subject scale: the fill names one, the ring the other. */
export function PlayerScaleKey({ subject, comparator }: { subject: string; comparator: string }) {
  const skin = useBlockSkin();
  const swatch = { display: 'inline-block', width: 10, height: 10, marginRight: 6 } as const;
  return (
    <p
      style={{
        margin: '0 0 8px',
        display: 'flex',
        flexWrap: 'wrap',
        columnGap: 16,
        fontFamily: skin.fontSans,
        fontSize: 12.5,
        color: 'var(--btl-block-ink-2)',
      }}
    >
      <span>
        <span aria-hidden style={{ ...swatch, background: 'var(--btl-block-subject)' }} />
        {subject}
      </span>
      <span>
        <span
          aria-hidden
          style={{
            ...swatch,
            borderRadius: '50%',
            border: '1.5px solid var(--btl-block-comparator)',
            boxSizing: 'border-box',
          }}
        />
        {comparator}
      </span>
    </p>
  );
}
