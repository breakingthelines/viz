import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import { SimilarList, type SimilarListItem } from './similar-list';

const QUICK_PICKS: SimilarListItem[] = [
  {
    id: 'self-last-season',
    name: 'Anis Hadj-Moussa',
    context: { text: '2025-26' },
    similarity: 100,
    stateLabel: 'Last season',
  },
  {
    id: 'teammate',
    name: 'Igor Paixão',
    context: { team: { label: 'Feyenoord', href: '/team/feyenoord' }, age: 24 },
    similarity: 86,
  },
  {
    id: 'rival',
    name: 'Calvin Stengs',
    context: { team: { label: 'Feyenoord', href: '/team/feyenoord' }, age: 27 },
    similarity: 84.5,
  },
];

const SIMILAR_PLAYERS: SimilarListItem[] = [
  {
    id: 'closest',
    name: 'Jayden Oosterwolde',
    href: '/player/jayden-oosterwolde',
    context: {
      team: { label: 'Fulham', href: '/team/fulham' },
      competition: { label: 'Premier League', href: '/competition/premier-league' },
      age: 23,
    },
    similarity: 83.1,
  },
];

const meta = {
  title: 'Stats/SimilarList',
  component: SimilarList,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SimilarList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Quick picks: `onSelect` makes every row a compare button, so the name
 * does not link (spec §4.2's quick-pick exception). */
export const QuickPicks: Story = {
  args: { items: QUICK_PICKS, onSelect: () => {} },
};

/** A plain similar-players list: no `onSelect`, so the name links to the
 * player's entity page and the context's team/competition link too. */
export const AsALinkedList: Story = {
  args: { items: SIMILAR_PLAYERS },
};

/** "N% similar" is the default state text; a row with `stateLabel` reads
 * that instead (the self pick reads "Last season"). */
export const VerifyStateText: Story = {
  args: { items: QUICK_PICKS, onSelect: () => {} },
  play: async ({ canvasElement }) => {
    const buttons = [...canvasElement.querySelectorAll('button')];
    const selfButton = buttons.find((b) => b.textContent?.includes('Hadj-Moussa'))!;
    await expect(selfButton.textContent).toContain('Last season');

    const teammateButton = buttons.find((b) => b.textContent?.includes('Paixão'))!;
    await expect(teammateButton.textContent).toContain('86% similar');
  },
};

/** Clicking a quick pick selects it; the parent then marks it `pressed`,
 * and this component swaps its state text to "On the wheel" (spec §4.2). */
export const VerifyPressedStateReadsOnTheWheel: Story = {
  args: { items: QUICK_PICKS },
  render: () => {
    const [comparingId, setComparingId] = useState<string | null>(null);
    const items = QUICK_PICKS.map((item) => ({ ...item, pressed: item.id === comparingId }));
    return (
      <SimilarList
        items={items}
        onSelect={(id) => setComparingId((current) => (current === id ? null : id))}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const button = [...canvasElement.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Paixão')
    )!;
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button.textContent).toContain('86% similar');

    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button.textContent).toContain('On the wheel');
  },
};

/** The quick-pick rows are buttons with no nested link — the name inside
 * them never links, even though `href` could be derived for these players. */
export const VerifyQuickPickNameIsNotALink: Story = {
  args: { items: QUICK_PICKS, onSelect: () => {} },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('a')).toHaveLength(0);
    await expect(canvasElement.querySelectorAll('button').length).toBe(QUICK_PICKS.length);
  },
};

/** In list mode (no `onSelect`), the name and the context's team/competition
 * each render as real entity links. */
export const VerifyListModeLinksEntities: Story = {
  args: { items: SIMILAR_PLAYERS },
  play: async ({ canvasElement }) => {
    const links = [...canvasElement.querySelectorAll('a')];
    await expect(links.map((a) => a.getAttribute('href'))).toEqual(
      expect.arrayContaining([
        '/player/jayden-oosterwolde',
        '/team/fulham',
        '/competition/premier-league',
      ])
    );
  },
};

/** Keyboard focus reaches a quick-pick button, and a pressed row carries
 * the mock's 8px box-shadow extension (`.simbtn:focus-visible`,
 * `.simbtn[aria-pressed="true"]`) — the pressed state via the plain
 * `[aria-pressed="true"]` attribute selector, directly testable, while the
 * hover/focus-visible pseudo-classes themselves aren't exercisable through
 * synthetic events in a real browser, so this checks that the rule is
 * present in the component's own stylesheet instead. */
export const VerifyFocusVisibleAndPressedStyling: Story = {
  args: { items: QUICK_PICKS },
  render: () => {
    const [comparingId, setComparingId] = useState<string | null>(null);
    const items = QUICK_PICKS.map((item) => ({ ...item, pressed: item.id === comparingId }));
    return (
      <SimilarList
        items={items}
        onSelect={(id) => setComparingId((current) => (current === id ? null : id))}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const button = [...canvasElement.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Paixão')
    )!;

    // Paixão is the second quick pick.
    await userEvent.tab();
    await userEvent.tab();
    await expect(document.activeElement).toBe(button);

    const styleText = canvasElement.querySelector('style')?.textContent ?? '';
    await expect(styleText).toContain(':hover');
    await expect(styleText).toContain(':focus-visible');

    await userEvent.click(button);
    await waitFor(() => expect(getComputedStyle(button).boxShadow).toContain('8px'));
  },
};

/** Entity links are never underlined (BTL link style); they turn red on hover and focus. */
export const VerifyEntityLinkStyle: Story = {
  args: { items: SIMILAR_PLAYERS },
  play: async ({ canvasElement }) => {
    const link = canvasElement.querySelector('a[href="/team/fulham"]') as HTMLElement;
    await expect(getComputedStyle(link).textDecorationLine).toBe('none');
    const styleText = canvasElement.querySelector('style')?.textContent ?? '';
    await expect(styleText).toContain('--color-red-100');
  },
};
