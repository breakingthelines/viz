import { useId, type CSSProperties, type ReactNode } from 'react';
import type { EntityLink } from './stat-metric';

/**
 * Quick picks and similar players (spec §4.1 `SimilarListProps`, mock
 * `scratchpad/prof/wheel2.py` `similar_picker`): each row reads "N%
 * similar" unless the caller gives it a `stateLabel` (the self pick reads
 * "Last season" instead), and the row the subject is currently comparing
 * against reads "On the wheel" (`pressed`).
 *
 * This list serves two callers (spec §4.2 "Entity links", the quick-pick
 * exception): as the Stats panel's compare quick picks, `onSelect` makes
 * every row one `<button>` and the name inside it does NOT link, because
 * the whole row IS the compare action; as a plain "similar players" list
 * elsewhere, with no `onSelect`, the name links to the player's entity page
 * through `href` when the caller resolved one. A row's `context` entity
 * links (team, competition) render as entity links only outside the
 * button case — a link can never nest inside a `<button>`.
 */

export interface SimilarListItem {
  id: string;
  name: string;
  href?: string;
  context: { team?: EntityLink; competition?: EntityLink; age?: number; text?: string };
  similarity: number;
  pressed?: boolean;
  stateLabel?: string;
}

export interface SimilarListProps {
  items: SimilarListItem[];
  onSelect?: (id: string) => void;
}

const WHITE = '#ffffff';
const MUTED = '#a29e9e';
const LINE = 'rgba(255, 255, 255, 0.08)';

function stateText(item: SimilarListItem): string {
  if (item.pressed) return 'On the wheel';
  if (item.stateLabel) return item.stateLabel;
  return `${Math.round(item.similarity)}% similar`;
}

/** The context line's parts, joined "Team, Competition, Age" or the plain
 * `text` fallback — plain strings when nested inside a button, entity
 * links otherwise. */
function ContextLine({
  context,
  linkable,
}: {
  context: SimilarListItem['context'];
  linkable: boolean;
}) {
  const parts: ReactNode[] = [];
  if (context.team) {
    parts.push(
      linkable && context.team.href ? (
        <a key="team" href={context.team.href} className="btl-sl-ent" style={{ color: 'inherit' }}>
          {context.team.label}
        </a>
      ) : (
        context.team.label
      )
    );
  }
  if (context.competition) {
    parts.push(
      linkable && context.competition.href ? (
        <a
          key="competition"
          href={context.competition.href}
          className="btl-sl-ent"
          style={{ color: 'inherit' }}
        >
          {context.competition.label}
        </a>
      ) : (
        context.competition.label
      )
    );
  }
  if (context.age != null) parts.push(context.age);
  if (context.text) parts.push(context.text);
  return (
    <span style={{ fontSize: 12, color: MUTED }}>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && ', '}
          {part}
        </span>
      ))}
    </span>
  );
}

interface RowContentProps {
  item: SimilarListItem;
  nameAsLink: boolean;
}

function RowContent({ item, nameAsLink }: RowContentProps) {
  return (
    <>
      <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>
          {nameAsLink && item.href ? (
            <a href={item.href} className="btl-sl-ent" style={{ color: 'inherit' }}>
              {item.name}
            </a>
          ) : (
            item.name
          )}
        </span>
        <ContextLine context={item.context} linkable={nameAsLink} />
      </span>
      <span
        style={{
          fontSize: 12,
          color: item.pressed ? WHITE : MUTED,
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        {stateText(item)}
      </span>
    </>
  );
}

// The reset (`all: unset`) and the hover/focus-visible/pressed backgrounds
// below live in the scoped stylesheet, not inline: an inline style always
// wins over a stylesheet rule regardless of selector specificity, so an
// inline `all: unset` would permanently cancel this button's own
// `:hover`/`:focus-visible`/`[aria-pressed="true"]` CSS rules. Only the
// layout values that never need to respond to interaction state stay here.
const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 12,
  alignItems: 'center',
  padding: '10px 0',
  borderTop: `1px solid ${LINE}`,
};

export function SimilarList({ items, onSelect }: SimilarListProps) {
  const scopeClass = `btl-sl-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className={scopeClass}>
      <style>{`
        .${scopeClass} .btl-sl-row {
          all: unset;
          box-sizing: border-box;
          width: 100%;
          cursor: pointer;
          background: transparent;
          transition: background 0.15s;
        }
        .${scopeClass} .btl-sl-row:hover,
        .${scopeClass} .btl-sl-row:focus-visible {
          background: rgba(255, 255, 255, 0.04);
          box-shadow: -8px 0 0 rgba(255, 255, 255, 0.04), 8px 0 0 rgba(255, 255, 255, 0.04);
          outline: none;
        }
        .${scopeClass} .btl-sl-row[aria-pressed="true"] {
          background: rgba(255, 255, 255, 0.07);
          box-shadow: -8px 0 0 rgba(255, 255, 255, 0.07), 8px 0 0 rgba(255, 255, 255, 0.07);
        }
        .${scopeClass} .btl-sl-ent {
          color: inherit;
          text-decoration: none;
          transition: color 0.15s;
        }
        .${scopeClass} .btl-sl-ent:hover,
        .${scopeClass} .btl-sl-ent:focus-visible {
          color: var(--color-red-100, #eb0000) !important;
          outline: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .${scopeClass} .btl-sl-row,
          .${scopeClass} .btl-sl-ent {
            transition: none;
          }
        }
      `}</style>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontFamily: 'Inter, sans-serif' }}>
        {items.map((item) =>
          onSelect ? (
            <li key={item.id}>
              <button
                type="button"
                className="btl-sl-row"
                aria-pressed={!!item.pressed}
                onClick={() => onSelect(item.id)}
                style={rowStyle}
              >
                <RowContent item={item} nameAsLink={false} />
              </button>
            </li>
          ) : (
            <li
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 12,
                alignItems: 'center',
                padding: '10px 0',
                borderTop: `1px solid ${LINE}`,
              }}
            >
              <RowContent item={item} nameAsLink />
            </li>
          )
        )}
      </ul>
    </div>
  );
}
