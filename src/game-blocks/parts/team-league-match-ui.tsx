import type { CSSProperties, ReactNode } from 'react';
import { Crest } from '#/football/lib/crest';
import type { GameBlockComponentProps } from '../block-props';
import {
  TABULAR,
  useBlockLayout,
  useBlockSkin,
  useBodyFont,
  type BlockFrameProps,
  type BlockMedia,
} from '../skin/index';
import { refName, type GameBlockRefJson } from './team-league-match-common';

/**
 * The frame props every team, league and match block shares: the author's
 * look, the title (subject name by default), the optional subheading, the
 * locked note and the save image name.
 */
export function frameBase(
  { config, titleSlot, density }: GameBlockComponentProps<unknown>,
  { context, noun, media }: { context: string; noun: string; media?: BlockMedia }
): Omit<BlockFrameProps, 'children'> {
  const subject = config.subject;
  return {
    look: config.look ?? 'editorial',
    title: config.title || subject.name,
    titleSlot,
    context,
    subheading: config.subheading,
    media:
      media ??
      (subject.crestUrl || subject.imageUrl
        ? { kind: 'crest', src: subject.crestUrl || subject.imageUrl }
        : undefined),
    lockedNote: config.lockedNote,
    density,
    exportName: `btl-${subject.name || config.title}-${noun}`,
  };
}

/**
 * Small skin-driven pieces the team, league and match blocks share: a table
 * with a subject row, a team name with its crest, a section label, a two-sided
 * share bar and a result strip. Every colour is a `--btl-block-*` token.
 */

export interface GridColumn {
  /** Sentence case, short: "Pts", "Goals", "Win %". Empty for no header text. */
  label: string;
  align?: 'left' | 'right' | 'center';
  /** A CSS grid track. Default `minmax(28px, auto)` for figures, `minmax(0, 1fr)` for the first. */
  width?: string;
  /** Bold, strongest ink: the column the table is about. */
  strong?: boolean;
  /** Left out below the two-column width. */
  wide?: boolean;
}

export interface GridRow {
  key: string;
  cells: ReactNode[];
  /** The highlighted subject: a red rule at its left edge, bold label. */
  subject?: boolean;
  /** A reference row (median, totals): faint ink. */
  muted?: boolean;
}

/**
 * A plain table: hairlines between rows, the first a little stronger, figures
 * right-aligned and tabular. One grid for the whole table, so columns line up
 * from the header down. No zebra rows, no boxes.
 */
export function BlockGrid({
  columns,
  rows,
  label,
  dense,
}: {
  columns: GridColumn[];
  rows: GridRow[];
  /** Accessible name of the table. */
  label?: string;
  dense?: boolean;
}) {
  const { look, narrow } = useBlockLayout();
  const skin = useBlockSkin();
  const font = useBodyFont();
  const editorial = look === 'editorial';
  const keep = columns.map((c) => !(c.wide && narrow));
  const visible = columns.filter((_, i) => keep[i]);
  const template = visible
    .map((c, i) => c.width ?? (i === 0 ? 'minmax(0, 1fr)' : 'auto'))
    .join(' ');
  // Names (the first column, or any flexible one) read left; figures right.
  const align = (c: GridColumn, i: number) =>
    c.align ?? (i === 0 || c.width?.includes('1fr') ? 'left' : 'right');
  // The name column: bold on the subject row.
  const nameAt = Math.max(
    0,
    visible.findIndex((c, i) => align(c, i) === 'left')
  );
  const hasHeader = visible.some((c) => c.label);
  const gap = narrow ? 8 : 12;
  const padY = dense ? [3, 2] : editorial ? [5, 4] : [7, 6];
  return (
    <div
      role="table"
      aria-label={label}
      style={{
        ...TABULAR,
        display: 'grid',
        gridTemplateColumns: template,
        alignItems: 'baseline',
        fontFamily: font,
      }}
    >
      {hasHeader ? (
        <div role="row" style={{ display: 'contents' }}>
          {visible.map((c, i) => (
            <span
              key={i}
              role="columnheader"
              style={{
                textAlign: align(c, i),
                paddingBottom: 4,
                paddingLeft: i === 0 ? 0 : gap,
                fontFamily: skin.fontSans,
                fontSize: 11.5,
                fontWeight: 400,
                color: 'var(--btl-block-ink-3)',
                whiteSpace: 'nowrap',
              }}
            >
              {c.label}
            </span>
          ))}
        </div>
      ) : null}
      {rows.map((r, ri) => (
        <div
          key={r.key}
          role="row"
          data-grid-subject={r.subject ? '' : undefined}
          style={{ display: 'contents' }}
        >
          {r.cells
            .filter((_, i) => keep[i])
            .map((cell, i) => {
              const col = visible[i];
              const strong = !r.muted && (col?.strong || (i === nameAt && r.subject));
              const rule = r.subject && i === 0;
              return (
                <span
                  key={i}
                  role="cell"
                  style={{
                    minWidth: 0,
                    alignSelf: 'stretch',
                    paddingTop: padY[0],
                    paddingBottom: padY[1],
                    paddingLeft: rule ? 8 : i === 0 ? 0 : gap,
                    marginLeft: rule ? -8 : 0,
                    boxShadow: rule ? 'inset 2px 0 0 var(--btl-block-subject)' : undefined,
                    borderTop: `1px solid ${ri === 0 ? 'var(--btl-block-line-strong)' : 'var(--btl-block-line)'}`,
                    textAlign: col ? align(col, i) : 'left',
                    fontSize: dense ? 13.5 : editorial ? 15 : 14,
                    lineHeight: 1.3,
                    fontWeight: strong ? 700 : 400,
                    color: strong
                      ? 'var(--btl-block-ink-1)'
                      : r.muted
                        ? 'var(--btl-block-ink-3)'
                        : 'var(--btl-block-ink-2)',
                    whiteSpace: 'nowrap',
                    ...(col && align(col, i) === 'left'
                      ? { overflow: 'hidden', textOverflow: 'ellipsis' }
                      : null),
                  }}
                >
                  {cell}
                </span>
              );
            })}
        </div>
      ))}
    </div>
  );
}

/** A team, player or competition name, with its crest or image when there is one. */
export function RefName({
  value,
  short,
  image = true,
  size = 16,
}: {
  value: GameBlockRefJson | undefined;
  /** Use the short name below the two-column width. */
  short?: boolean;
  image?: boolean;
  size?: number;
}) {
  const { narrow } = useBlockLayout();
  const name = refName(value, !!short && narrow);
  const style: CSSProperties = {
    width: size,
    height: size,
    marginRight: 7,
    borderRadius: 'var(--btl-block-radius)',
    verticalAlign: '-0.15em',
    objectFit: 'contain',
  };
  return (
    <>
      {image && value?.imageUrl ? <Crest url={value.imageUrl} style={style} /> : null}
      {name}
    </>
  );
}

/** A quiet label over a group of rows: "Ins", "Goalkeepers", "Quarter-finals". */
export function SectionLabel({ children, first }: { children: ReactNode; first?: boolean }) {
  const skin = useBlockSkin();
  const { look } = useBlockLayout();
  return (
    <p
      style={{
        margin: first ? '0 0 6px' : '18px 0 6px',
        fontFamily: look === 'editorial' ? skin.fontSerif : skin.fontSans,
        fontStyle: look === 'editorial' ? 'italic' : undefined,
        fontWeight: look === 'editorial' ? 400 : 600,
        fontSize: look === 'editorial' ? 17 : 13.5,
        color: 'var(--btl-block-ink-2)',
      }}
    >
      {children}
    </p>
  );
}

/**
 * Two figures as one bar: the left side as the red fill, the right as the
 * outlined comparator, split at their share of the total.
 */
export function SplitBar({ left, right }: { left: number; right: number }) {
  const total = left + right;
  const share = total > 0 ? (left / total) * 100 : 50;
  return (
    <span
      role="img"
      aria-label={`${Math.round(share)} to ${Math.round(100 - share)}`}
      data-split={Math.round(share)}
      style={{ display: 'flex', height: 6, gap: 2, marginTop: 4 }}
    >
      <span style={{ width: `${share}%`, background: 'var(--btl-block-subject)' }} />
      <span
        style={{
          flex: 1,
          boxSizing: 'border-box',
          border: '1px solid var(--btl-block-comparator)',
        }}
      />
    </span>
  );
}

/**
 * Results as a strip of marks, oldest first: a win is the red fill, a draw the
 * outlined ring, a defeat the empty track. The letter stays for screen readers
 * and for the eye.
 */
export function ResultStrip({ results, size = 22 }: { results: string[]; size?: number }) {
  const skin = useBlockSkin();
  return (
    <span
      role="list"
      aria-label="Results, oldest first"
      style={{ display: 'inline-flex', gap: size > 16 ? 4 : 2, flexWrap: 'wrap' }}
    >
      {results.map((r, i) => {
        const style: CSSProperties = {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          boxSizing: 'border-box',
          borderRadius: 'var(--btl-block-radius)',
          fontFamily: skin.fontSans,
          fontSize: size > 16 ? 11.5 : 9,
          fontWeight: 700,
        };
        if (r === 'W') {
          style.background = 'var(--btl-block-subject)';
          style.color = 'var(--btl-block-ink-1)';
        } else if (r === 'D') {
          style.border = '1.5px solid var(--btl-block-comparator)';
          style.color = 'var(--btl-block-ink-1)';
        } else {
          style.background = 'var(--btl-block-track)';
          style.color = 'var(--btl-block-ink-3)';
        }
        return (
          <span key={i} role="listitem" data-result={r} style={style}>
            {r}
          </span>
        );
      })}
    </span>
  );
}

/** A fixed-width box for a `BlockScale` inside a grid cell, narrower at phone width. */
export function ScaleCell({ children, width = 96 }: { children: ReactNode; width?: number }) {
  const { narrow } = useBlockLayout();
  return (
    <span
      style={{
        display: 'inline-block',
        width: narrow ? Math.min(width, 64) : width,
        verticalAlign: 'middle',
      }}
    >
      {children}
    </span>
  );
}
