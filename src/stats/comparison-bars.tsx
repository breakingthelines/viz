import { useId, useMemo } from 'react';
import { ramp } from '../brand/colour';
import { formatMetricValue, formatPercentile } from './format';

/**
 * "Side by side" — the mirrored comparison bars (spec §4.1 `ComparisonBarsProps`,
 * mock `scratchpad/prof/wheel2.py` `drawBars`/`.h2h` CSS): the subject's row on
 * the left ramping to full BTL red, the compared player's row on the right
 * ramping to full white, grouped the same way as {@link PercentileRows},
 * each row's stronger value highlighted, a fixed median tick at the row's
 * centre (a percentile's own median is always the 50th rank, so the tick
 * never moves with the data), and the two names above — with a season label
 * appended whenever the caller passes one (typically only when the two
 * seasons differ).
 *
 * The bars themselves ramp exactly as the mock's own `drawBars` does: its
 * flat-looking `.h2h .ht.l i{background:#eb0000}` / `.ht.r i{background:
 * rgba(255,255,255,.78)}` CSS is overridden inline by `colour(a)` /
 * `colourW(b)` — the same ramp this component calls through `ramp()` — so
 * there is no departure here. The value *text*, though, stays flat per the
 * mock's `.hv b{color:#fff}` / `.hr.win-l .hv.l b{color:#eb0000}` /
 * `.hr.win-r .hv.r b{color:#fff}`: only the left (subject) value turns red
 * when it is the stronger side; the right (comparison) value is always
 * white.
 */

export interface ComparisonBarsRow {
  key: string;
  label: string;
  group: string;
  left: { value: number | null; percentile: number | null };
  right: { value: number | null; percentile: number | null };
  unit: 'per90' | 'percent';
}

export interface ComparisonBarsProps {
  left: { name: string; seasonLabel?: string };
  right: { name: string; seasonLabel?: string };
  rows: ComparisonBarsRow[];
}

const MUTED = '#a29e9e';
const LINE = 'rgba(255, 255, 255, 0.06)';
const TRACK = 'rgba(255, 255, 255, 0.05)';
const MEDIAN_TICK = 'rgba(255, 255, 255, 0.35)';

/** Groups rows by `group`, preserving each group's first-seen order — the
 * caller supplies rows already in the order groups should render. */
export function groupRows(
  rows: ComparisonBarsRow[]
): { group: string; rows: ComparisonBarsRow[] }[] {
  const order: string[] = [];
  const byGroup = new Map<string, ComparisonBarsRow[]>();
  for (const row of rows) {
    if (!byGroup.has(row.group)) {
      order.push(row.group);
      byGroup.set(row.group, []);
    }
    byGroup.get(row.group)!.push(row);
  }
  return order.map((group) => ({ group, rows: byGroup.get(group)! }));
}

function nameWithSeason(side: { name: string; seasonLabel?: string }): string {
  return side.seasonLabel ? `${side.name}, ${side.seasonLabel}` : side.name;
}

interface SideValueProps {
  value: number | null;
  percentile: number | null;
  unit: 'per90' | 'percent';
  side: 'subject' | 'comparison';
  stronger: boolean;
  /** Text alignment for the value stack, away from the centre gutter. */
  align: 'left' | 'right';
}

function SideValue({ value, percentile, unit, side, stronger, align }: SideValueProps) {
  // The value text is flat, not ramped (mock: `.hv b{color:#fff}`,
  // `.hr.win-l .hv.l b{color:#eb0000}`, `.hr.win-r .hv.r b{color:#fff}`):
  // only the left/subject side ever turns red, and only when it is the
  // stronger side. The right/comparison side is always white.
  const textColour = side === 'subject' && stronger ? '#eb0000' : '#ffffff';
  return (
    <span
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        lineHeight: 1.2,
        textAlign: align,
      }}
    >
      <b
        style={{
          fontSize: 14,
          color: textColour,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatMetricValue(value, unit)}
      </b>
      <span style={{ fontSize: 11.5, color: MUTED, fontVariantNumeric: 'tabular-nums' }}>
        {formatPercentile(percentile)}
      </span>
    </span>
  );
}

interface SideBarProps {
  percentile: number | null;
  side: 'subject' | 'comparison';
  /** Which edge the bar fills from — the subject's bar grows leftward from
   * the centre gutter, the comparison's grows rightward (mock: `.h2h .ht.l`
   * fills from `right:0`, `.h2h .ht.r` from `left:0`). */
  fillFrom: 'left' | 'right';
}

function SideBar({ percentile, side, fillFrom }: SideBarProps) {
  const width = percentile === null || !Number.isFinite(percentile) ? 0 : Math.max(percentile, 0);
  const colour = ramp(percentile, side);
  return (
    <span
      style={{
        height: 10,
        background: TRACK,
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span
        className="btl-cb-fill"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          [fillFrom]: 0,
          width: `${width}%`,
          borderRadius: 2,
          background: colour,
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: -2,
          bottom: -2,
          left: '50%',
          width: 1,
          background: MEDIAN_TICK,
        }}
      />
    </span>
  );
}

export function ComparisonBars({ left, right, rows }: ComparisonBarsProps) {
  const groups = useMemo(() => groupRows(rows), [rows]);
  const scopeClass = `btl-cb-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div
      className={scopeClass}
      style={{ fontFamily: 'Inter, sans-serif', fontVariantNumeric: 'tabular-nums' }}
    >
      <style>{`
        .${scopeClass} .btl-cb-row {
          display: grid;
          grid-template-columns: 64px minmax(0, 1fr) 132px minmax(0, 1fr) 64px;
          align-items: center;
          gap: 10px;
          padding: 6px 0;
          border-top: 1px solid ${LINE};
        }
        @media (max-width: 760px) {
          .${scopeClass} .btl-cb-row {
            grid-template-columns: 48px minmax(0, 1fr) 72px minmax(0, 1fr) 48px;
            gap: 6px;
          }
          .${scopeClass} .btl-cb-label {
            font-size: 11px;
          }
        }
        .${scopeClass} .btl-cb-fill {
          transition: width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .${scopeClass} .btl-cb-fill {
            transition: none;
          }
        }
      `}</style>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 16,
          padding: '0 0 10px',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        <span style={{ color: '#eb0000' }}>{nameWithSeason(left)}</span>
        <span style={{ color: '#ffffff', textAlign: 'right' }}>{nameWithSeason(right)}</span>
      </div>
      {groups.map(({ group, rows: groupRowsForGroup }) => (
        <div key={group}>
          <div
            style={{
              padding: '14px 0 6px',
              fontSize: 12,
              fontWeight: 600,
              color: MUTED,
              textAlign: 'center',
            }}
          >
            {group}
          </div>
          {groupRowsForGroup.map((row) => {
            const leftP = row.left.percentile;
            const rightP = row.right.percentile;
            const leftStronger = leftP !== null && rightP !== null && leftP > rightP;
            const rightStronger = leftP !== null && rightP !== null && rightP > leftP;
            return (
              <div key={row.key} className="btl-cb-row">
                <SideValue
                  value={row.left.value}
                  percentile={leftP}
                  unit={row.unit}
                  side="subject"
                  stronger={leftStronger}
                  align="left"
                />
                <SideBar percentile={leftP} side="subject" fillFrom="right" />
                <span
                  className="btl-cb-label"
                  style={{ textAlign: 'center', fontSize: 12.5, color: '#d9d6d6' }}
                >
                  {row.label}
                </span>
                <SideBar percentile={rightP} side="comparison" fillFrom="left" />
                <SideValue
                  value={row.right.value}
                  percentile={rightP}
                  unit={row.unit}
                  side="comparison"
                  stronger={rightStronger}
                  align="right"
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
