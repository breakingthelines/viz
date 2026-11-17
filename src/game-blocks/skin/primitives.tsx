import type { CSSProperties, ReactNode } from 'react';
import { useGatedCell } from '../values';
import { useBlockLayout, useBlockScale, useBlockSkin } from './provider';

/**
 * The parts every block body is built from. Each reads the enclosing frame's
 * look, so a block written once draws in all three.
 */

const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

export const TABULAR: CSSProperties = { fontVariantNumeric: 'tabular-nums lining-nums' };

/** The face a look sets its body text in. */
export function useBodyFont(): string {
  const { look } = useBlockLayout();
  const skin = useBlockSkin();
  return look === 'editorial' ? skin.fontSerif : skin.fontSans;
}

/**
 * A locked or pending figure: a short calm dashed rule where the figure would
 * sit. Screen readers hear "Locked" or "Loading".
 */
export function LockedRule({
  width = 22,
  state = 'locked',
}: {
  width?: number | string;
  state?: 'locked' | 'pending';
}) {
  return (
    <span
      data-cell-state={state}
      style={{
        position: 'relative',
        display: 'inline-block',
        width,
        borderTop: '1px dashed var(--btl-block-locked)',
        verticalAlign: 'middle',
      }}
    >
      <span style={SR_ONLY}>{state === 'locked' ? 'Locked' : 'Loading'}</span>
    </span>
  );
}

/**
 * One gated cell of the enclosing block: its display text, or the locked rule.
 * `fallback` replaces the rule when the cell is locked or pending (a hero that
 * falls back to a public figure); `NO_DATA` shows a dash.
 */
export function GatedValue({
  cell,
  fallback,
  width,
}: {
  cell: string;
  fallback?: ReactNode;
  width?: number | string;
}) {
  const read = useGatedCell(cell);
  if (read.state === 'value') return <>{read.display ?? String(read.value ?? '')}</>;
  if (read.state === 'no-data') return <>{'–'}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  return <LockedRule width={width} state={read.state} />;
}

/**
 * The hero figure with its unit word after it (style.md, Typography): Le
 * Monde Journal bold with the unit in italic ink 3 (editorial), Inter
 * (annotated). Poster draws its hero in the frame's art instead, so blocks
 * pass it to `BlockFrame.hero`. Baseline items are no longer drawn: a
 * genuine label and value pair goes in `FactRows`.
 */
export function BlockFigure({
  figure,
  label,
}: {
  figure: ReactNode;
  label: string;
  /** @deprecated Not drawn. */
  baseline?: ReactNode[];
}) {
  const { look } = useBlockLayout();
  const skin = useBlockSkin();
  const scale = useBlockScale();
  const sans = look === 'annotated';
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
      <span
        data-block-anchor="hero"
        style={{
          ...TABULAR,
          fontFamily: sans ? skin.fontSans : skin.fontSerif,
          fontWeight: 700,
          fontSize: scale.hero,
          lineHeight: 0.86,
          letterSpacing: sans ? '-0.04em' : '-0.03em',
          color: 'var(--btl-block-ink-1)',
          whiteSpace: 'nowrap',
        }}
      >
        {figure}
      </span>
      {label ? (
        <span
          data-block-anchor="hero-label"
          style={{
            fontFamily: sans ? skin.fontSans : skin.fontSerif,
            fontStyle: sans ? 'normal' : 'italic',
            fontSize: scale.heroUnit,
            lineHeight: 1.1,
            color: 'var(--btl-block-ink-3)',
          }}
        >
          {label.replace(/per 90/g, 'per\u00a090')}
        </span>
      ) : null}
    </div>
  );
}

/** Short figures on one line, spaced, no separators drawn as boxes. */
export function BlockBaseline({ items }: { items: ReactNode[] }) {
  const font = useBodyFont();
  const { look } = useBlockLayout();
  return (
    <p
      style={{
        ...TABULAR,
        margin: '8px 0 0',
        display: 'flex',
        flexWrap: 'wrap',
        columnGap: 16,
        rowGap: 2,
        fontFamily: font,
        fontSize: look === 'editorial' ? 16 : 14,
        lineHeight: 1.35,
        color: 'var(--btl-block-ink-2)',
      }}
    >
      {items.map((item, i) => (
        <span key={i}>{item}</span>
      ))}
    </p>
  );
}

export interface BlockRow {
  key: string;
  label: ReactNode;
  cells: ReactNode[];
}

/**
 * A plain table on the shared row height: the name, then right-aligned
 * figures in Inter, a hairline between rows. The first figure column is
 * semibold ink 1, the rest regular ink 3. `columns` labels the header; pass
 * an empty list for no header.
 */
export function BlockRows({ columns, rows }: { columns: string[]; rows: BlockRow[] }) {
  const skin = useBlockSkin();
  const scale = useBlockScale();
  const { look } = useBlockLayout();
  const font = useBodyFont();
  const n = rows[0]?.cells.length ?? Math.max(0, columns.length - 1);
  const grid = `minmax(0, 1fr) ${Array.from({ length: n }, () => 'minmax(44px, auto)').join(' ')}`;
  return (
    <div role="table" style={{ ...TABULAR }}>
      {columns.length > 0 ? (
        <div
          role="row"
          style={{
            display: 'grid',
            gridTemplateColumns: grid,
            columnGap: 12,
            alignItems: 'center',
            minHeight: 26,
            borderBottom: '1px solid var(--btl-block-line-strong)',
            fontFamily: skin.fontSans,
            fontSize: scale.small,
            color: 'var(--btl-block-ink-3)',
          }}
        >
          {columns.map((c, i) => (
            <span key={i} role="columnheader" style={{ textAlign: i === 0 ? 'left' : 'right' }}>
              {c}
            </span>
          ))}
        </div>
      ) : null}
      {rows.map((r, i) => (
        <div
          key={r.key}
          role="row"
          style={{
            display: 'grid',
            gridTemplateColumns: grid,
            columnGap: 12,
            alignItems: 'center',
            minHeight: scale.row,
            borderBottom: i === rows.length - 1 ? 0 : '1px solid var(--btl-block-line)',
          }}
        >
          <span
            role="cell"
            style={{
              minWidth: 0,
              fontFamily: font,
              fontSize: look === 'editorial' ? scale.word : scale.wordSans,
              color: 'var(--btl-block-ink-1)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {r.label}
          </span>
          {r.cells.map((c, j) => (
            <span
              key={j}
              role="cell"
              style={{
                textAlign: 'right',
                fontFamily: skin.fontSans,
                fontSize: scale.number,
                fontWeight: j === 0 ? 600 : 400,
                color: j === 0 ? 'var(--btl-block-ink-1)' : 'var(--btl-block-ink-3)',
                whiteSpace: 'nowrap',
              }}
            >
              {c}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * One 0 to 100 scale: the subject as a red fill, the median as a tick at its
 * own position, a comparator as an outlined ring. Ranks map onto it as
 * `(n - rank) / (n - 1) * 100`. Locked or pending draws the track dashed with
 * no fill. `label` names the drawn value when it is not itself out of 100.
 */
export function BlockScale({
  value,
  median,
  comparator,
  size,
  state = 'value',
  label,
}: {
  value: number;
  median?: number;
  comparator?: number;
  size: 'row' | 'hero';
  state?: 'value' | 'locked' | 'pending';
  label?: string;
}) {
  const skin = useBlockSkin();
  const h = size === 'hero' ? 10 : 6;
  const pct = (v: number) => `${Math.min(100, Math.max(0, v))}%`;
  const filled = state === 'value';
  return (
    <span
      data-scale-state={state}
      role="img"
      aria-label={
        filled
          ? (label ?? `${Math.round(value)} out of 100`)
          : state === 'locked'
            ? 'Locked'
            : 'Loading'
      }
      style={{ position: 'relative', display: 'block', height: h + 6, minWidth: 48 }}
    >
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 3,
          height: h,
          borderRadius: skin.radius,
          background: filled ? 'var(--btl-block-track)' : 'transparent',
          borderTop: filled ? undefined : '1px dashed var(--btl-block-locked)',
        }}
      />
      {filled ? (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 3,
            height: h,
            width: pct(value),
            borderRadius: skin.radius,
            background: 'var(--btl-block-subject)',
          }}
        />
      ) : null}
      {filled && median !== undefined ? (
        <span
          data-scale-median=""
          style={{
            position: 'absolute',
            left: pct(median),
            top: 0,
            width: 1.5,
            height: h + 6,
            marginLeft: -0.75,
            background: 'var(--btl-block-tick)',
          }}
        />
      ) : null}
      {filled && comparator !== undefined ? (
        <span
          data-scale-comparator=""
          style={{
            position: 'absolute',
            left: pct(comparator),
            top: 3 + h / 2 - (h + 2) / 2,
            width: h + 2,
            height: h + 2,
            marginLeft: -(h + 2) / 2,
            borderRadius: '50%',
            border: '1.5px solid var(--btl-block-comparator)',
            boxSizing: 'border-box',
          }}
        />
      ) : null}
    </span>
  );
}
