import { useId, useMemo, type CSSProperties } from 'react';
import { ramp } from '../brand/colour';
import { formatPercentile } from './format';

/**
 * The Archetypes list (spec §4.2, mock `scratchpad/prof/wheel2.py`
 * `role_fit`/`render`'s archetype block): a player holds every archetype at
 * the 90th percentile or above; when none reaches it, his single best fit
 * is shown held instead (`item.held`, decided by the caller — §2.4's fit
 * ranking). Held names render bright, the rest muted, in descending
 * percentile order; event-only rows (`state: 'pending' | 'locked'`, no
 * event data for this league yet) sit at the bottom, muted and dashed, with
 * no number and no placeholder copy (spec §4.5 — the mock's own
 * `role-ev` rows print nothing in that slot either, so there is nothing to
 * depart from there).
 *
 * Hovering previews an archetype (`onHover`); clicking selects and pins it,
 * clicking the same one again deselects it (`onToggle` — this component is
 * controlled, so the caller owns `selectedId` and decides whether a second
 * click clears it, matching the mock's own pin/unpin toggle). Enter and
 * Space act the same as a click, on every interactive row.
 *
 * A row is interactive only when `onToggle` is passed: a value row then
 * renders as a real `<button>` inside its `<li>` (never `role="button"` on
 * the `<li>` itself, which breaks the `aria-allowed-role` and `list` axe
 * rules) with the percentile folded into its accessible name through
 * `aria-describedby` rather than overriding it with `aria-label`, so a
 * screen reader still hears the rank. Event-only (`pending`/`locked`) rows
 * and, when the caller passes no `onToggle` (for example a read-only
 * Overview `compact` card), value rows too, render as plain, non-tabbable
 * list items — the mock's own `role-ev` rows carry no `tabindex` and no
 * handlers either.
 */

export interface ArchetypeListItem {
  id: string;
  name: string;
  percentile: number | null;
  held: boolean;
  state: 'value' | 'pending' | 'locked';
  metricKeys: string[];
  /** A deduplicated, comma-joined description of the metrics behind this
   * archetype's fit (e.g. "Key passes, Assists"), read out for screen
   * readers; never shown as caption copy in the row itself (spec §4.5). */
  metricLabels: string;
}

export interface ArchetypeListProps {
  items: ArchetypeListItem[];
  selectedId?: string | null;
  onHover?: (id: string | null) => void;
  onToggle?: (id: string) => void;
  /** Smaller type and spacing for a secondary placement (e.g. the Overview
   * card's top-5 bars) rather than the full Stats list. */
  compact?: boolean;
}

const WHITE = '#ffffff';
const MUTED = '#a29e9e';
const LINE = 'rgba(255, 255, 255, 0.08)';
const TRACK = '#2b2b2b';

/** Value-state items sorted by percentile descending (nulls last), then
 * every pending/locked item appended at the bottom in the order given — the
 * event-only rows never compete for rank against a value the player
 * actually has (mock: `items.sort(...)` runs only over shown value rows;
 * the event rows are a separate, always-last list). */
export function orderedItems(items: ArchetypeListItem[]): ArchetypeListItem[] {
  const value = items.filter((item) => item.state === 'value');
  const eventOnly = items.filter((item) => item.state !== 'value');
  const sortedValue = [...value].sort((a, b) => {
    if (a.percentile === null && b.percentile === null) return 0;
    if (a.percentile === null) return 1;
    if (b.percentile === null) return -1;
    return b.percentile - a.percentile;
  });
  return [...sortedValue, ...eventOnly];
}

interface RowProps {
  item: ArchetypeListItem;
  selected: boolean;
  compact: boolean;
  interactive: boolean;
  onHover?: (id: string | null) => void;
  onToggle?: (id: string) => void;
}

function Row({ item, selected, compact, interactive, onHover, onToggle }: RowProps) {
  const isEventOnly = item.state !== 'value';
  const percentile = item.percentile;
  const colour = ramp(percentile, 'subject');
  const descId = useId();

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: compact ? '90px minmax(0, 1fr) 48px' : '110px minmax(0, 1fr) 56px',
    alignItems: 'center',
    gap: 14,
  };

  const content = (
    <>
      <span
        style={{
          fontSize: compact ? 13 : 14,
          fontWeight: 600,
          color: isEventOnly || !item.held ? MUTED : WHITE,
        }}
      >
        {item.name}
      </span>
      {isEventOnly ? (
        <span
          aria-hidden
          style={{ height: 6, border: '1px dashed rgba(255, 255, 255, 0.3)', borderRadius: 3 }}
        />
      ) : (
        <span
          style={{
            height: 6,
            background: TRACK,
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <span
            className="btl-al-fill"
            style={{
              position: 'absolute',
              inset: '0 auto 0 0',
              width: `${percentile ?? 0}%`,
              background: colour,
              borderRadius: 3,
            }}
          />
        </span>
      )}
      <span
        style={{
          fontSize: compact ? 16 : 18,
          fontWeight: 700,
          letterSpacing: -0.3,
          color: isEventOnly ? MUTED : WHITE,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {isEventOnly ? '' : formatPercentile(percentile)}
      </span>
    </>
  );

  // Read out for screen readers via `aria-describedby` on the interactive
  // button only — never `aria-label`, which would replace the button's
  // accessible name and drop the percentile a sighted user sees.
  const description = item.metricLabels ? (
    <span
      id={descId}
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
      }}
    >
      {item.metricLabels}
    </span>
  ) : null;

  // Event-only rows, and value rows when the caller passes no `onToggle`
  // (a read-only placement such as the Overview `compact` card), are plain,
  // non-interactive list items — never tabbable, never a button (spec §4.2,
  // mock's own untabbable `role-ev` rows).
  if (!interactive) {
    return (
      <li
        className="btl-al-row"
        style={{
          ...gridStyle,
          padding: compact ? '7px 0' : '10px 0',
          borderTop: `1px solid ${LINE}`,
        }}
      >
        {content}
      </li>
    );
  }

  return (
    <li className="btl-al-row btl-al-interactive" style={{ borderTop: `1px solid ${LINE}` }}>
      {/* The reset (`all: unset`) and the pressed/hover/focus-visible
       * backgrounds below live in the scoped stylesheet, not inline:
       * an inline style always wins over a stylesheet rule regardless of
       * selector specificity, so an inline `all: unset` would permanently
       * cancel this button's own `:hover`/`:focus-visible`/
       * `[aria-pressed="true"]` CSS rules. Only the genuinely per-item
       * layout values (grid columns, padding) stay inline. */}
      <button
        type="button"
        className="btl-al-btn"
        aria-pressed={selected}
        aria-describedby={item.metricLabels ? descId : undefined}
        onMouseEnter={() => onHover?.(item.id)}
        onMouseLeave={() => onHover?.(null)}
        onClick={() => onToggle?.(item.id)}
        style={{
          ...gridStyle,
          padding: compact ? '7px 0' : '10px 0',
        }}
      >
        {content}
        {description}
      </button>
    </li>
  );
}

export function ArchetypeList({
  items,
  selectedId,
  onHover,
  onToggle,
  compact = false,
}: ArchetypeListProps) {
  const ordered = useMemo(() => orderedItems(items), [items]);
  const scopeClass = `btl-al-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div
      className={scopeClass}
      style={{ display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}
    >
      <style>{`
        .${scopeClass} .btl-al-btn {
          all: unset;
          box-sizing: border-box;
          width: 100%;
          cursor: pointer;
          background: transparent;
        }
        .${scopeClass} .btl-al-btn:hover,
        .${scopeClass} .btl-al-btn:focus-visible {
          background: rgba(255, 255, 255, 0.04);
          outline: none;
        }
        .${scopeClass} .btl-al-btn[aria-pressed="true"] {
          background: rgba(255, 255, 255, 0.07);
          box-shadow: -8px 0 0 rgba(255, 255, 255, 0.07), 8px 0 0 rgba(255, 255, 255, 0.07);
        }
        .${scopeClass} .btl-al-fill {
          transition: width 0.35s, background 0.35s;
        }
        @media (prefers-reduced-motion: reduce) {
          .${scopeClass} .btl-al-fill {
            transition: none;
          }
        }
      `}</style>
      {!compact && (
        <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: WHITE }}>
          Archetypes
        </h3>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {ordered.map((item) => (
          <Row
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            compact={compact}
            interactive={item.state === 'value' && !!onToggle}
            onHover={onHover}
            onToggle={onToggle}
          />
        ))}
      </ul>
    </div>
  );
}
