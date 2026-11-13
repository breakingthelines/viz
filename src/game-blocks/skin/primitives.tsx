import type { CSSProperties, ReactNode } from 'react';
import { useGatedCell } from '../values';
import { useBlockLayout, useBlockSkin } from './provider';

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
 * The hero figure and the short label that names it. Editorial sets it in Le
 * Monde with an italic label beside it, annotated in Inter. Poster draws its
 * hero in the frame's panel instead, so blocks pass it to `BlockFrame.hero`.
 */
export function BlockFigure({
  figure,
  label,
  baseline,
}: {
  figure: ReactNode;
  label: string;
  /** Short figures after the hero: "94th", "Median 1.40". Never a sentence. */
  baseline?: ReactNode[];
}) {
  const { look, narrow, density } = useBlockLayout();
  const skin = useBlockSkin();
  const small = density !== 'article';
  const editorial = look !== 'annotated';
  const size = editorial ? (small ? 64 : narrow ? 78 : 92) : small ? 52 : narrow ? 60 : 72;
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: editorial ? 'last baseline' : 'baseline',
          gap: editorial ? 10 : 12,
          flexWrap: editorial ? 'nowrap' : 'wrap',
        }}
      >
        <span
          data-block-anchor="hero"
          style={{
            ...TABULAR,
            fontFamily: editorial ? skin.fontSerif : skin.fontSans,
            fontWeight: 700,
            fontSize: size,
            lineHeight: editorial ? 0.92 : 0.95,
            letterSpacing: editorial ? '-0.025em' : '-0.035em',
            color: 'var(--btl-block-ink-1)',
            whiteSpace: 'nowrap',
          }}
        >
          {figure}
        </span>
        <span
          data-block-anchor="hero-label"
          style={
            editorial
              ? {
                  fontFamily: skin.fontSerif,
                  fontStyle: 'italic',
                  fontSize: narrow ? 18 : 19,
                  lineHeight: 1.1,
                  color: 'var(--btl-block-ink-2)',
                  maxWidth: '6.5em',
                }
              : { fontFamily: skin.fontSans, fontSize: 16, color: 'var(--btl-block-ink-2)' }
          }
        >
          {label.replace(/per 90/g, 'per\u00a090')}
        </span>
      </div>
      {baseline && baseline.length > 0 ? <BlockBaseline items={baseline} /> : null}
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
 * A plain table: label column then right-aligned figure columns, hairlines
 * between rows, the first a little stronger. The first figure column is bold.
 * `columns` labels the header; pass an empty list for no header.
 */
export function BlockRows({ columns, rows }: { columns: string[]; rows: BlockRow[] }) {
  const { look } = useBlockLayout();
  const skin = useBlockSkin();
  const font = useBodyFont();
  const editorial = look === 'editorial';
  const n = rows[0]?.cells.length ?? Math.max(0, columns.length - 1);
  const grid = `minmax(0, 1fr) ${Array.from({ length: n }, () => 'minmax(44px, auto)').join(' ')}`;
  return (
    <div role="table" style={{ ...TABULAR, fontFamily: font }}>
      {columns.length > 0 ? (
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
            gap: 8,
            alignItems: 'baseline',
            padding: editorial ? '4px 0 3px' : '8px 0 7px',
            borderTop: `1px solid ${i === 0 ? 'var(--btl-block-line-strong)' : 'var(--btl-block-line)'}`,
            fontSize: editorial ? 15 : 14.5,
            lineHeight: 1.25,
            color: 'var(--btl-block-ink-2)',
          }}
        >
          <span role="cell" style={{ minWidth: 0 }}>
            {r.label}
          </span>
          {r.cells.map((c, j) => (
            <span
              key={j}
              role="cell"
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
