import { useState, type ReactNode } from 'react';

// ── Share-menu-style dropdown ────────────────────────────────────────────────
// The anchored share-menu trigger + glass content used by every StatsBomb block
// control (the Heat Map player filter, the Line-breaking view toggle, the
// Progression filter, the Press-map metric, …). Hoisted here so the look lives
// in ONE place instead of being copy-pasted into each block. Self-contained on
// purpose: viz is a standalone AGPL package with no design-system dependency, so
// the classes inline the editor's game-block kit rather than importing it.

/** Trigger button classes — a compact pill that matches the editor share-menu. */
export const TRIGGER_CLS =
  'flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white transition-colors hover:border-white/25';

/** Popover content classes. Width/scroll are tuned per-call via `contentClassName`. */
export const CONTENT_CLS =
  'absolute right-0 top-[calc(100%+6px)] z-50 flex max-h-[300px] min-w-[170px] flex-col gap-0.5 overflow-y-auto rounded-[8px] border border-white/10 bg-[#161616]/95 p-1 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl';

export interface ControlDropdownProps {
  /** Muted prefix label inside the trigger (e.g. "Player", "Showing"). */
  label: string;
  /** Bold current-value label inside the trigger. */
  valueLabel: ReactNode;
  /**
   * Popover body. Receives a `close` callback so an item can dismiss the menu on
   * select (render-prop so the open state stays owned here).
   */
  children: (close: () => void) => ReactNode;
  /** Extra classes appended to {@link CONTENT_CLS} (e.g. a wider `min-w`). */
  contentClassName?: string;
}

/**
 * A single anchored dropdown: a pill trigger that toggles a glassy popover. The
 * popover closes on blur once focus leaves the whole control, so it behaves as a
 * lightweight listbox without any portal/focus-trap machinery.
 */
export function ControlDropdown({
  label,
  valueLabel,
  children,
  contentClassName,
}: ControlDropdownProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        className={TRIGGER_CLS}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={(e) => {
          // Close when focus leaves the dropdown entirely.
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
      >
        <span className="text-white/50">{label}</span>
        <span className="font-semibold">{valueLabel}</span>
        <Caret />
      </button>
      {open && (
        <div
          role="listbox"
          className={contentClassName ? `${CONTENT_CLS} ${contentClassName}` : CONTENT_CLS}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export interface DropdownItemProps {
  /** Whether this row is the current selection (shows the check glyph). */
  selected: boolean;
  /** Invoked on click. */
  onSelect: () => void;
  /** Row label. */
  children: ReactNode;
}

/** One selectable row inside a {@link ControlDropdown} popover. */
export function DropdownItem({ selected, onSelect, children }: DropdownItemProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onMouseDown={(e) => e.preventDefault()} // keep trigger focus so blur-close doesn't beat the click
      onClick={onSelect}
      className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-[6px] px-2.5 py-1.5 text-left text-[12px] text-white transition-colors hover:bg-white/[0.06]"
    >
      <span className="truncate">{children}</span>
      {selected && <Check />}
    </button>
  );
}

/**
 * A non-interactive group heading inside the popover (e.g. a team name above its
 * players). Used by {@link PlayerSelect} to split the player list by team.
 */
export function DropdownGroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1 px-2.5 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-white/35 first:mt-0">
      {children}
    </div>
  );
}

/** Tiny caret glyph (no icon dependency in this package). */
export function Caret() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" className="text-white/40">
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Tiny check glyph for the selected dropdown row. */
export function Check() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="text-[#eb0000]">
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
