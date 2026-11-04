import type { ReactNode } from 'react';
import { BLOCK_FONT_STACK } from '#/football/lib/font';

/** One league's row on the ladder (spec §2.5, §4.1; mock `prof/nextmove.py:ladder`). */
export interface LeagueLadderRow {
  id: string;
  name: string;
  /** League strength index, 40-100 (Premier League = 100, §2.3). Drives the bar width directly — it is already a 0-100 scale. */
  index: number;
  /** Present whenever the league resolves to a BTL competition page. */
  href?: string;
  /** True for the subject's own league — bolded, red bar, instead of the plain grey everyone else gets. */
  highlight?: boolean;
}

export interface LeagueLadderProps {
  rows: LeagueLadderRow[];
  /**
   * Renders a row's name. Lets a host wire its OWN link component (e.g. a
   * router `Link`, for client-side navigation) rather than a plain `<a
   * href>` — the same reason {@link LeagueLadderRow.href} alone is not
   * enough once the host has its own router. Receives the row and the
   * default plain-text/anchor rendering, so a host can wrap it rather than
   * reimplement it. Defaults to the plain anchor/text rendering when the
   * host passes nothing.
   */
  renderName?: (row: LeagueLadderRow, defaultNode: ReactNode) => ReactNode;
}

const RED = '#eb0000';
const GREY = '#6b6666';
const TRACK = '#2b2b2b';
const WHITE = '#ffffff';
const LIGHT = '#d9d6d6';
const LINE = 'rgba(255,255,255,0.08)';

/** Clamp a league index into a sane bar width — the index is a 0-100 scale already, but a future rating version could in principle push past 100. */
export function leagueLadderBarWidth(index: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(index) ? index : 0));
}

/**
 * The league-strength ladder in "Next move" (spec §2.5, §4.2): the strongest
 * rated leagues by index, the subject's own league picked out in red and
 * bold (plus a 13th row for it when it falls outside the leaders the host
 * passed) — everyone else a plain grey bar. No chart watermark: the mock
 * does not paint one behind this list (`nextmove.py:ladder` has none,
 * unlike the form and seasons charts).
 */
export function LeagueLadder({ rows, renderName }: LeagueLadderProps) {
  return (
    <ul
      data-slot="league-ladder"
      style={{ fontFamily: BLOCK_FONT_STACK }}
      className="m-0 list-none p-0"
    >
      {rows.map((row) => {
        const own = Boolean(row.highlight);
        const defaultNode: ReactNode = row.href ? (
          <a href={row.href} style={{ color: own ? WHITE : LIGHT }}>
            {row.name}
          </a>
        ) : (
          row.name
        );
        return (
          <li
            key={row.id}
            className="grid items-center gap-3 py-[7px]"
            style={{
              gridTemplateColumns: '150px minmax(0,1fr) 36px',
              borderTop: `1px solid ${LINE}`,
            }}
          >
            <span
              className="truncate text-[13px]"
              style={{ fontWeight: own ? 700 : 500, color: own ? WHITE : LIGHT }}
            >
              {renderName ? renderName(row, defaultNode) : defaultNode}
            </span>
            <span
              className="relative overflow-hidden rounded-[2px]"
              style={{ height: 8, background: TRACK }}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-[2px]"
                style={{
                  width: `${leagueLadderBarWidth(row.index)}%`,
                  background: own ? RED : GREY,
                }}
              />
            </span>
            <span
              className="text-right text-[13px] font-bold tabular-nums"
              style={{ color: WHITE }}
            >
              {row.index}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
