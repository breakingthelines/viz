import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import { ArchetypeList, type ArchetypeListItem } from './archetype-list';

const ITEMS: ArchetypeListItem[] = [
  {
    id: 'ball-runner',
    name: 'Ball Runner',
    percentile: 94,
    held: true,
    state: 'value',
    metricKeys: ['drs', 'drp', 'fd'],
    metricLabels: 'Successful dribbles, Dribble success %, Fouls won',
  },
  {
    id: 'final-ball',
    name: 'Final Ball',
    percentile: 72,
    held: false,
    state: 'value',
    metricKeys: ['key', 'ast'],
    metricLabels: 'Key passes, Assists',
  },
  {
    id: 'engine',
    name: 'Engine',
    percentile: 55,
    held: false,
    state: 'value',
    metricKeys: ['tkl', 'int', 'passes', 'key', 'shots'],
    metricLabels: 'Tackles, Interceptions, Passes, Key passes, Shots',
  },
  {
    id: 'line-breaker',
    name: 'Line Breaker',
    percentile: null,
    held: false,
    state: 'pending',
    metricKeys: ['prgp', 'prgc', 'f3', 'key'],
    metricLabels: 'Progressive passes, Progressive carries, Passes into final third, Key passes',
  },
];

const meta = {
  title: 'Stats/ArchetypeList',
  component: ArchetypeList,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ArchetypeList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { items: ITEMS },
};

export const Compact: Story = {
  args: { items: ITEMS.slice(0, 3), compact: true },
};

/**
 * No archetype reaches the 90th percentile; the best fit still shows held
 * (spec: "If none reaches it, his best fit is shown"), decided by the
 * caller via `held` — this list just renders what it is given.
 */
export const BestFitWhenNoneHeld: Story = {
  args: {
    items: [
      { ...ITEMS[0]!, percentile: 78, held: true },
      { ...ITEMS[1]!, percentile: 64, held: false },
    ],
  },
};

/**
 * Event-only rows render muted, dashed, at the bottom, with no number and
 * no placeholder copy (spec §4.5) — ordered after every value row
 * regardless of where they sit in the `items` prop.
 */
export const EventOnlyRowsMutedAtTheBottom: Story = {
  args: { items: [ITEMS[3]!, ITEMS[0]!, ITEMS[1]!] },
  play: async ({ canvasElement }) => {
    const names = [...canvasElement.querySelectorAll('li')].map(
      (li) => li.querySelector('span')?.textContent
    );
    await expect(names[names.length - 1]).toBe('Line Breaker');

    const eventRow = [...canvasElement.querySelectorAll('li')].find((li) =>
      li.textContent?.includes('Line Breaker')
    )!;
    // The percentile cell must be empty — no number, no "Event data" text.
    const cells = eventRow.querySelectorAll('span');
    const lastCell = cells[cells.length - 1]!;
    await expect(lastCell.textContent).toBe('');
  },
};

/** Click to select and pin an archetype, click the same one again to
 * deselect (spec §4.2) — this list is controlled, so the story owns the
 * toggle-off behaviour the same way the platform page would. */
export const VerifyClickSelectsAndDeselects: Story = {
  args: { items: ITEMS },
  render: () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    return (
      <ArchetypeList
        items={ITEMS}
        selectedId={selectedId}
        onToggle={(id) => setSelectedId((current) => (current === id ? null : id))}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const button = [...canvasElement.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Final Ball')
    )!;
    await expect(button).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-pressed', 'false');
  },
};

/** Enter and Space act the same as a click, on any row. */
export const VerifyKeyboardTogglesSelection: Story = {
  args: { items: ITEMS },
  render: () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    return (
      <ArchetypeList
        items={ITEMS}
        selectedId={selectedId}
        onToggle={(id) => setSelectedId((current) => (current === id ? null : id))}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const button = [...canvasElement.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Engine')
    )!;
    button.focus();
    await userEvent.keyboard('{Enter}');
    await expect(button).toHaveAttribute('aria-pressed', 'true');

    await userEvent.keyboard(' ');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
  },
};

/** Hovering a row reports it through `onHover`, and leaving reports `null`
 * — wired up only when `onToggle` is also passed, since that is what makes
 * a row interactive at all (spec §4.2; a row is never hoverable, tabbable
 * or clickable on its own without a toggle handler). */
export const VerifyHoverPreviews: Story = {
  args: { items: ITEMS },
  render: () => {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    return (
      <div>
        <p data-testid="hover-readout">{hoveredId ?? 'none'}</p>
        <ArchetypeList
          items={ITEMS}
          selectedId={selectedId}
          onHover={setHoveredId}
          onToggle={(id) => setSelectedId((current) => (current === id ? null : id))}
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const button = [...canvasElement.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Ball Runner')
    )!;
    await userEvent.hover(button);
    await expect(canvasElement.querySelector('[data-testid="hover-readout"]')!.textContent).toBe(
      'ball-runner'
    );
    await userEvent.unhover(button);
    await expect(canvasElement.querySelector('[data-testid="hover-readout"]')!.textContent).toBe(
      'none'
    );
  },
};

/** Event-only rows (pending/locked) are never interactive: no `<button>`,
 * no `tabindex`, no hover handler — even when `onToggle` is passed (mock's
 * `role-ev` rows carry neither `tabindex` nor handlers). A value row with
 * no `onToggle` (e.g. a read-only `compact` placement) is equally inert. */
export const VerifyEventOnlyAndReadOnlyRowsAreNotInteractive: Story = {
  args: { items: ITEMS, onToggle: () => {} },
  play: async ({ canvasElement }) => {
    // Even with onToggle passed, the event-only "Line Breaker" row is still
    // not a button and carries no tabindex.
    const lineBreakerRow = [...canvasElement.querySelectorAll('li')].find((li) =>
      li.textContent?.includes('Line Breaker')
    )!;
    await expect(lineBreakerRow.querySelector('button')).toBeNull();
    await expect(lineBreakerRow).not.toHaveAttribute('tabindex');
  },
};

/** Without `onToggle` at all (a read-only placement such as the Overview
 * compact card), no row — not even a value row — renders a `<button>`. */
export const VerifyReadOnlyWithoutOnToggleHasNoButtons: Story = {
  args: { items: ITEMS, compact: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('button')).toHaveLength(0);
  },
};

/** Keyboard focus reaches the row (mock `.role:hover,.role:focus-visible`
 * paint the same background this scoped stylesheet declares — the pseudo-
 * classes themselves aren't exercisable through synthetic pointer/focus
 * events in a real browser, so this checks what a play test safely can:
 * the rule is present in the component's own stylesheet, and the row is
 * keyboard-reachable). A pinned (selected) row carries the mock's 8px
 * box-shadow extension, driven by the plain `[aria-pressed="true"]`
 * attribute selector rather than a pseudo-class, so it is directly
 * testable. */
export const VerifyFocusVisibleAndPinnedStyling: Story = {
  args: { items: ITEMS },
  render: () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    return (
      <ArchetypeList
        items={ITEMS}
        selectedId={selectedId}
        onToggle={(id) => setSelectedId((current) => (current === id ? null : id))}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const buttons = [...canvasElement.querySelectorAll('button')];
    const firstButton = buttons[0]!;

    await userEvent.tab();
    await expect(document.activeElement).toBe(firstButton);

    const styleText = canvasElement.querySelector('style')?.textContent ?? '';
    await expect(styleText).toContain(':hover');
    await expect(styleText).toContain(':focus-visible');

    await userEvent.click(firstButton);
    await waitFor(() => expect(getComputedStyle(firstButton).boxShadow).toContain('8px'));
  },
};
