import type { CSSProperties, ReactNode } from 'react';
import { Crest } from '#/football/lib/crest';
import { resolveMediaSrc, useMediaBase } from './assets';
import { TABULAR } from './primitives';
import { useBlockLayout, useBlockScale, useBlockSkin, type BlockLayout } from './provider';
import type { BlockScaleTokens } from './tokens';

/**
 * The shared rows of the block style (style.md, Context and label columns,
 * Alignment and spacing): fact rows, section headings, table rows on one
 * grid with the shared label column and row height, a bar, the quiet lines.
 * Every block builds its body from these, so one change here restyles all.
 */

/** Names and words: the serif in editorial, Inter in the poster and annotated looks. */
export function useWordStyle(): CSSProperties {
  const { look } = useBlockLayout();
  const skin = useBlockSkin();
  const scale = useBlockScale();
  const serif = look === 'editorial';
  return {
    fontFamily: serif ? skin.fontSerif : skin.fontSans,
    fontSize: serif ? scale.word : scale.wordSans,
    color: 'var(--btl-block-ink-1)',
  };
}

/** A number: Inter semibold, tabular lining figures, never the serif. */
export function Num({
  children,
  dim,
  style,
}: {
  children: ReactNode;
  /** A losing or secondary figure: regular weight, ink 3. */
  dim?: boolean;
  style?: CSSProperties;
}) {
  const skin = useBlockSkin();
  const scale = useBlockScale();
  return (
    <span
      data-num=""
      style={{
        ...TABULAR,
        fontFamily: skin.fontSans,
        fontWeight: dim ? 400 : 600,
        fontSize: scale.number,
        color: dim ? 'var(--btl-block-ink-3)' : 'var(--btl-block-ink-1)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export type Fact = readonly [label: string, value: ReactNode];

/**
 * Genuine label and value pairs, the Orbit pattern: "Last 5:" then the value,
 * in the one label column (104px, 78px narrow, growing to its longest label).
 * A team, a competition or "Played" is never a label: those go in
 * `QuietLines`.
 */
export function FactRows({ rows }: { rows: (Fact | null | undefined | false)[] }) {
  const scale = useBlockScale();
  const skin = useBlockSkin();
  const word = useWordStyle();
  const kept = rows.filter((r): r is Fact => !!r);
  if (kept.length === 0) return null;
  return (
    <div
      data-fact-rows=""
      style={{
        display: 'grid',
        gridTemplateColumns: `minmax(${scale.labelCol}px, max-content) minmax(0, 1fr)`,
        columnGap: 14,
        rowGap: 8,
        alignItems: 'baseline',
      }}
    >
      {kept.map(([label, value]) => (
        <div key={label} style={{ display: 'contents' }}>
          <span
            style={{
              fontFamily: skin.fontSans,
              fontSize: scale.label,
              color: 'var(--btl-block-ink-3)',
              whiteSpace: 'nowrap',
            }}
          >
            {label}:
          </span>
          <span style={{ ...word, lineHeight: 1.3, minWidth: 0 }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

/** The stat or the scope alone over a strong hairline: "Goals", "vs Premier League strikers". */
export function SectionHeading({ children }: { children: ReactNode }) {
  const skin = useBlockSkin();
  const scale = useBlockScale();
  return (
    <div
      data-section-heading=""
      style={{
        fontFamily: skin.fontSans,
        fontSize: scale.label,
        color: 'var(--btl-block-ink-3)',
        paddingBottom: 9,
        borderBottom: '1px solid var(--btl-block-line-strong)',
      }}
    >
      {children}
    </div>
  );
}

/** A section: an optional heading and its rows. */
export function Section({
  heading,
  children,
  style,
}: {
  heading?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section data-block-section="" style={style}>
      {heading ? <SectionHeading>{heading}</SectionHeading> : null}
      {children}
    </section>
  );
}

/** Sections stacked 28px apart (24px narrow), or two columns on a wide block. */
export function Sections({ children, columns = 1 }: { children: ReactNode; columns?: 1 | 2 }) {
  const { narrow } = useBlockLayout();
  const scale = useBlockScale();
  const two = columns === 2 && !narrow;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: two ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
        columnGap: 32,
        rowGap: scale.sectionGap,
        alignItems: 'start',
      }}
    >
      {children}
    </div>
  );
}

/**
 * One table row on a grid template: 38px (34px narrow), a hairline under it,
 * none under the last of its group. `head` is a column header row: 26px, a
 * strong hairline under it.
 */
export function Row({
  cols,
  children,
  head,
  last,
  style,
  ...rest
}: {
  cols: string;
  children: ReactNode;
  head?: boolean;
  last?: boolean;
  style?: CSSProperties;
} & Record<`data-${string}`, string | undefined>) {
  const scale = useBlockScale();
  return (
    <div
      role="row"
      {...rest}
      style={{
        display: 'grid',
        gridTemplateColumns: cols,
        alignItems: 'center',
        columnGap: 12,
        minHeight: head ? 26 : scale.row,
        borderBottom: head
          ? '1px solid var(--btl-block-line-strong)'
          : last
            ? 0
            : '1px solid var(--btl-block-line)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A table: its rows, the last without a hairline under it. */
export function Rows({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div role="table" aria-label={label} data-block-rows="" style={{ display: 'grid' }}>
      {children}
    </div>
  );
}

/** A name or a value in words: the word face, cut short with an ellipsis. */
export function NameCell({
  children,
  align,
  style,
}: {
  children: ReactNode;
  align?: 'left' | 'right';
  style?: CSSProperties;
}) {
  const word = useWordStyle();
  return (
    <span
      role="cell"
      style={{
        ...word,
        minWidth: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textAlign: align,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/** A stat's name in a row of figures: Inter, ink 2 ("Shots on target"). */
export function StatCell({ children }: { children: ReactNode }) {
  const skin = useBlockSkin();
  const scale = useBlockScale();
  return (
    <span
      role="cell"
      style={{
        fontFamily: skin.fontSans,
        fontSize: scale.wordSans - 1,
        color: 'var(--btl-block-ink-2)',
        minWidth: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {children}
    </span>
  );
}

/** A label in the label column, or a column header: Inter, label size, ink 3. */
export function LabelCell({
  children,
  align,
  small,
  style,
}: {
  children?: ReactNode;
  align?: 'left' | 'right' | 'center';
  /** The small aside size: a club in a leaderboard, a reason, a header. */
  small?: boolean;
  style?: CSSProperties;
}) {
  const skin = useBlockSkin();
  const scale = useBlockScale();
  return (
    <span
      role="cell"
      style={{
        ...TABULAR,
        fontFamily: skin.fontSans,
        fontSize: small ? scale.small : scale.label,
        color: 'var(--btl-block-ink-3)',
        textAlign: align,
        minWidth: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/** A figure cell: right-aligned by default. */
export function NumCell({
  children,
  dim,
  align = 'right',
  style,
}: {
  children: ReactNode;
  dim?: boolean;
  align?: 'left' | 'right' | 'center';
  style?: CSSProperties;
}) {
  return (
    <span role="cell" style={{ textAlign: align, minWidth: 0 }}>
      <Num dim={dim} style={style}>
        {children}
      </Num>
    </span>
  );
}

/** A crest in a row: 18px (16px narrow). An empty cell when there is none. */
export function CrestCell({ src }: { src?: string }) {
  const { narrow } = useBlockLayout();
  const url = resolveMediaSrc(src, useMediaBase());
  const size = narrow ? 16 : 18;
  return (
    <span role="cell" style={{ display: 'flex', alignItems: 'center' }}>
      {url ? (
        <Crest
          url={url}
          style={{ width: size, height: size, objectFit: 'contain', borderRadius: 0 }}
        />
      ) : null}
    </span>
  );
}

/** A 0 to 1 bar: red on the track, or ink 4 for a losing or lower figure. */
export function Bar({ frac, dim, label }: { frac: number; dim?: boolean; label?: string }) {
  const f = Math.max(0, Math.min(1, Number.isFinite(frac) ? frac : 0));
  return (
    <span
      role="img"
      aria-label={label ?? `${Math.round(f * 100)} out of 100`}
      data-bar={Math.round(f * 100)}
      style={{
        position: 'relative',
        display: 'block',
        height: 8,
        background: 'var(--btl-block-track)',
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${f * 100}%`,
          background: dim ? 'var(--btl-block-ink-4)' : 'var(--btl-block-subject)',
        }}
      />
    </span>
  );
}

/**
 * At most two quiet lines: facts that are not label and value pairs, each a
 * plain run ("Premier League, Matchday 9"; "1 Nov 2026, Anfield"). Inter,
 * label size, ink 3.
 */
export function QuietLines({ lines }: { lines: (string | null | undefined | false)[] }) {
  const skin = useBlockSkin();
  const scale = useBlockScale();
  const kept = lines.filter((l): l is string => !!l).slice(0, 2);
  if (kept.length === 0) return null;
  return (
    <div
      data-quiet-lines=""
      style={{
        marginTop: scale.titleGap,
        fontFamily: skin.fontSans,
        fontSize: scale.label,
        lineHeight: 1.6,
        color: 'var(--btl-block-ink-3)',
      }}
    >
      {kept.map((l) => (
        <div key={l}>{l}</div>
      ))}
    </div>
  );
}

/**
 * The enclosing frame's layout for a block body. A block component renders
 * `BlockFrame` itself, so its own hooks run outside the frame and read the
 * default layout; a body that depends on the width or the drawn look reads
 * it through this, inside the frame.
 */
export function InFrame({
  children,
}: {
  children: (layout: BlockLayout & { scale: BlockScaleTokens }) => ReactNode;
}) {
  const layout = useBlockLayout();
  const scale = useBlockScale();
  return <>{children({ ...layout, scale })}</>;
}
