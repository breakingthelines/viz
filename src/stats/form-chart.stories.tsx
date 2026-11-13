import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import { FormChart, type FormChartMatch } from './form-chart';

const OPPONENTS = ['AZ', 'PSV', 'Ajax', 'Feyenoord', 'Twente', 'Utrecht', 'Sparta', 'Go Ahead'];

/** Deterministic fixture matches, oldest to newest, loosely shaped like the mock's `form_rows()`. */
function buildMatches(count: number, offset = 0): FormChartMatch[] {
  return Array.from({ length: count }, (_, i) => {
    const n = offset + i;
    const rating = 6 + ((n * 7) % 35) / 10;
    const result: FormChartMatch['result'] = rating >= 7.5 ? 'W' : rating >= 6.5 ? 'D' : 'L';
    const opponent = OPPONENTS[n % OPPONENTS.length] ?? 'Opponent';
    return {
      id: `m${n}`,
      date: `${(n % 27) + 1} ${['Jan', 'Feb', 'Mar', 'Apr', 'May'][n % 5]}`,
      opponent: { label: opponent, href: `/team/${opponent.toLowerCase()}` },
      result,
      score: result === 'W' ? '2-1' : result === 'D' ? '1-1' : '0-1',
      venue: n % 2 === 0 ? 'H' : 'A',
      minutes: n % 6 === 0 ? 63 : 90,
      goals: result === 'W' && n % 3 === 0 ? 1 : 0,
      assists: result !== 'L' && n % 4 === 0 ? 1 : 0,
      rating,
      title: `${opponent}, rating ${rating.toFixed(1)}`,
    };
  });
}

const meta = {
  title: 'Stats/FormChart',
  component: FormChart,
  parameters: { layout: 'padded', backgrounds: { default: 'dark' } },
  tags: ['autodocs'],
} satisfies Meta<typeof FormChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { matches: buildMatches(18) },
};

export const FewerThanAWindow: Story = {
  name: 'Fewer matches than one window',
  args: { matches: buildMatches(4) },
};

export const NoLink: Story = {
  name: 'Opponents with no resolved entity',
  args: {
    matches: buildMatches(10).map((m) => ({ ...m, opponent: { label: m.opponent.label } })),
  },
};

/**
 * Exercises paging: starts on the newest window, steps earlier twice, then
 * back to today, then past the start of the loaded data to confirm
 * `onOlder` fires, the window moves to show the prepended matches on that
 * same click cycle (not a click later), a second click while the fetch is
 * "in flight" is ignored, and the caller's prepended matches let paging
 * continue (spec: "pages back through every rated match", across seasons).
 *
 * The prepend itself is deferred one macrotask (`setTimeout`), rather than
 * applied synchronously inside `onOlder`, so a click fired before the host
 * has actually prepended anything exercises the real double-click guard
 * (`pendingOlder`) instead of merely landing on a window that has already
 * moved off the boundary by the time the second click runs.
 */
function PagingHarness() {
  const [earliestOffset, setEarliestOffset] = useState(20);
  const [matches, setMatches] = useState(buildMatches(14, 20));
  const [olderCalls, setOlderCalls] = useState(0);
  return (
    <div>
      <p data-testid="older-calls" style={{ color: '#a29e9e', fontSize: 12, marginBottom: 8 }}>
        onOlder calls: {olderCalls}
      </p>
      <FormChart
        matches={matches}
        hasOlder
        onOlder={() => {
          setOlderCalls((n) => n + 1);
          // Deferred: a fetch stands in for this. Anything that checks the
          // guard against a second click must do so before this fires.
          setTimeout(() => {
            const next = earliestOffset - 20;
            setEarliestOffset(next);
            // A realistically larger prepend than one window/step, so a
            // further click after the prepend steps back within the loaded
            // data instead of immediately hitting the oldest-loaded edge
            // again.
            setMatches((prev) => [...buildMatches(20, next), ...prev]);
          }, 0);
        }}
      />
    </div>
  );
}

export const Paging: Story = {
  args: { matches: [] },
  render: () => <PagingHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const earlier = canvas.getByRole('button', { name: 'Earlier matches' });
    const later = canvas.getByRole('button', { name: 'Later matches' });
    const olderCalls = () => canvas.getByTestId('older-calls').textContent ?? '';
    const range = () => canvas.getByText(/to/, { selector: 'span' }).textContent;

    // Resting on the newest window: "later" has nowhere further to go.
    expect(later).toBeDisabled();
    expect(earlier).not.toBeDisabled();
    expect(olderCalls()).toBe('onOlder calls: 0');

    await userEvent.click(earlier);
    expect(later, 'stepping earlier must re-enable later').not.toBeDisabled();

    await userEvent.click(later);
    expect(later, 'back at the newest window, later is disabled again').toBeDisabled();

    // Page back to the oldest loaded match (14 loaded, window 10, step 5 —
    // one click lands exactly on the oldest loaded match: m20 to m29).
    await userEvent.click(earlier);
    await waitFor(() =>
      expect(range(), 'resting exactly on the oldest loaded window, before any prepend').toBe(
        '21 Jan to 3 May'
      )
    );

    // A double click right at the oldest loaded match — before the host's
    // deferred prepend has resolved — must call `onOlder` only once, not
    // twice. Both fires happen before the harness's `setTimeout` runs, so
    // `matches` has not grown yet and the window is still parked on the
    // boundary: this actually exercises the `pendingOlder` guard, rather
    // than landing on a click that moved off the boundary already.
    fireEvent.click(earlier);
    fireEvent.click(earlier);
    expect(
      olderCalls(),
      'a double click at the boundary, before the prepend resolves, fires onOlder only once'
    ).toBe('onOlder calls: 1');

    // Let the deferred prepend resolve: wait for the window to actually
    // move to the host's prepended matches, rather than a fixed delay a
    // busier CI runner can easily outrun (the host's `setTimeout(…, 0)` is
    // not guaranteed to fire within any particular wall-clock window).
    await waitFor(() =>
      expect(range(), "the window shows the host's prepended matches once onOlder resolves").toBe(
        '16 Jan to 25 May'
      )
    );

    // The prepend resolving does not call onOlder a second time either.
    expect(olderCalls(), 'the prepend resolving does not call onOlder again').toBe(
      'onOlder calls: 1'
    );

    // One more click, now inside the newly-prepended data rather than back
    // at the boundary, steps back by `step` (5) within what is loaded —
    // it does not call onOlder again: m10 to m19.
    await userEvent.click(earlier);
    await waitFor(() =>
      expect(range(), 'stepping within already-loaded data moves the window').toBe(
        '11 Jan to 20 May'
      )
    );
    expect(olderCalls(), 'stepping within already-loaded data does not call onOlder again').toBe(
      'onOlder calls: 1'
    );
  },
};

/**
 * A click at the oldest loaded match whose `onOlder` fetch fails: the host
 * never prepends anything and instead flips `hasOlder` to `false`, then
 * (say the subject's games get re-synced) back to `true` with the data
 * still unchanged. Without clearing `pendingOlder` when `hasOlder` first
 * drops, it would stay stuck forever and "Earlier matches" would never
 * re-enable even once `hasOlder` says there is more to load again.
 */
function FailedOlderHarness() {
  const [hasOlder, setHasOlder] = useState(true);
  return (
    <div>
      <button type="button" data-testid="flip-has-older" onClick={() => setHasOlder((v) => !v)}>
        flip hasOlder (currently {String(hasOlder)})
      </button>
      <FormChart matches={buildMatches(14, 20)} hasOlder={hasOlder} onOlder={() => {}} />
    </div>
  );
}

export const RecoversAfterFailedOlderFetch: Story = {
  name: 'Earlier re-enables once hasOlder returns true after a failed fetch',
  args: { matches: [] },
  render: () => <FailedOlderHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const earlier = canvas.getByRole('button', { name: 'Earlier matches' });
    const flip = canvas.getByTestId('flip-has-older');

    // Step to the oldest loaded match (14 loaded, window 10, step 5 — one
    // click lands exactly on it), then ask for more; the fetch never
    // prepends anything.
    await userEvent.click(earlier);
    await userEvent.click(earlier);
    expect(earlier, 'still waiting on the (failed) fetch').toBeDisabled();

    // The host's fetch failed and it reports there is nothing more, for
    // now, by dropping hasOlder.
    await userEvent.click(flip);
    expect(earlier, 'hasOlder is false, so there is genuinely nothing to page into').toBeDisabled();

    // The host finds out there is more after all (a re-sync, a retry) and
    // raises hasOlder again, with matches unchanged.
    await userEvent.click(flip);
    expect(
      earlier,
      'hasOlder is true again: the earlier failed fetch must not leave this stuck disabled'
    ).not.toBeDisabled();
  },
};

/** The oldest-loaded boundary with no `onOlder` host (`hasOlder` false): Earlier simply disables once there, since there is nothing further to page into. */
export const NoOlderAvailable: Story = {
  name: 'Earlier disables at the oldest loaded match with no onOlder host',
  args: { matches: buildMatches(14, 20), hasOlder: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const earlier = canvas.getByRole('button', { name: 'Earlier matches' });
    await userEvent.click(earlier);
    expect(earlier, 'no further matches to page into, and no host to ask for more').toBeDisabled();
  },
};

export const SingleBarTooltip: Story = {
  name: 'Bar carries the full-sentence tooltip',
  args: { matches: buildMatches(1) },
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector('title');
    expect(title?.textContent, 'the mock shows this as a native tooltip').toContain('rating');
  },
};

/**
 * Each match is one link, on its label under the bar, and its accessible
 * name carries the date, rating and G/A, not just the result and opponent.
 * The bar links to the same place for a pointer but stays out of the tab
 * order, so the chart itself remains a presentational image.
 */
export const LinkedLabelsAreAccessible: Story = {
  name: 'One accessible link per match, on its label',
  args: { matches: buildMatches(3) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const svg = canvasElement.querySelector('svg[aria-label="Match ratings"]');
    expect(svg?.getAttribute('role')).toBe('img');
    const links = canvas.getAllByRole('link');
    expect(links.length, 'one link per match, the bar link is hidden').toBe(3);
    const name = links[0]?.getAttribute('aria-label') ?? '';
    expect(name, 'carries the date beyond just result and opponent').toMatch(/\d/);
    expect(name, 'carries the rating beyond just result and opponent').toContain('rating');
    expect(getComputedStyle(links[0] as Element).textDecorationLine, 'no underline at rest').toBe(
      'none'
    );
  },
};

/** The owner's case: ten long club names under ten bars (Cole Palmer, 2026-27). */
const LONG_NAMES: { label: string; shortLabel?: string }[] = [
  { label: 'Fulham' },
  { label: 'Brighton & Hove Albion', shortLabel: 'Brighton' },
  { label: 'Aston Villa', shortLabel: 'Villa' },
  { label: 'Leeds United', shortLabel: 'Leeds' },
  { label: 'Hull City A.F.C.', shortLabel: 'Hull' },
  { label: 'Brentford' },
  { label: 'AFC Bournemouth', shortLabel: 'Bournemouth' },
  { label: 'Tottenham Hotspur' },
  { label: 'Nottingham Forest', shortLabel: 'Forest' },
  { label: 'Manchester United', shortLabel: 'Man United' },
];

const CREST =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><path d="M2 2h14v7c0 4-3 6-7 7-4-1-7-3-7-7z" fill="#5b5b5b"/></svg>'
  );

function longNameMatches(): FormChartMatch[] {
  return buildMatches(10).map((m, i) => {
    const opponent = LONG_NAMES[i] ?? { label: 'Opponent' };
    return { ...m, opponent: { ...opponent, href: `/team/${i}`, crestSources: [CREST] } };
  });
}

/** No label runs past its own column: each is cut inside its cell. */
async function expectLabelsInsideColumns(canvasElement: HTMLElement) {
  const cells = Array.from(canvasElement.querySelectorAll('[data-slot="form-label"]'));
  expect(cells.length).toBe(10);
  for (const cell of cells) {
    const box = cell.getBoundingClientRect();
    for (const child of Array.from(cell.querySelectorAll('span, img'))) {
      const r = child.getBoundingClientRect();
      if (r.width === 0) continue;
      expect(r.left, cell.getAttribute('title') ?? '').toBeGreaterThanOrEqual(box.left - 0.5);
      expect(r.right, cell.getAttribute('title') ?? '').toBeLessThanOrEqual(box.right + 0.5);
    }
  }
}

export const LongOpponentNames: Story = {
  name: 'Long opponent names, wide',
  args: { matches: longNameMatches() },
  decorators: [
    (Story) => (
      <div style={{ width: 760 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    await expectLabelsInsideColumns(canvasElement);
    const first = canvasElement.querySelector('[data-slot="form-label"]');
    expect(first?.getAttribute('title'), 'the full name stays in the tooltip').toBe('Fulham');
    const crests = Array.from(canvasElement.querySelectorAll('[data-slot="form-label"] img'));
    expect(
      crests.every((img) => img.getBoundingClientRect().width === 0),
      'names, not crests, when there is room'
    ).toBe(true);
  },
};

export const NarrowWithoutCrests: Story = {
  name: 'Phone width, no crest: three-letter marks',
  args: {
    matches: longNameMatches().map((m, i) => ({
      ...m,
      // The first opponent's only address fails, so it falls back too.
      opponent: { ...m.opponent, crestSources: i === 0 ? ['/missing-crest.png'] : [] },
    })),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 318 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelectorAll('[data-slot="form-label"] img').length).toBe(0)
    );
    await expectLabelsInsideColumns(canvasElement);
    const first = canvasElement.querySelector('[data-slot="form-label"]');
    expect(first?.textContent).toContain('FUL');
  },
};

export const LongOpponentNamesNarrow: Story = {
  name: 'Long opponent names, phone width',
  args: { matches: longNameMatches() },
  decorators: [
    (Story) => (
      <div style={{ width: 318 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    await expectLabelsInsideColumns(canvasElement);
    const crests = Array.from(canvasElement.querySelectorAll('[data-slot="form-label"] img'));
    expect(crests.length).toBe(10);
    expect(
      crests.every((img) => img.getBoundingClientRect().width > 0),
      'crests stand in for names'
    ).toBe(true);
  },
};

/** With no resolved link at all, the chart stays a presentational image — there is nothing for a keyboard user to reach inside it. */
export const UnlinkedBarsStayPresentational: Story = {
  name: 'No links means the chart stays role="img"',
  args: {
    matches: buildMatches(3).map((m) => ({ ...m, opponent: { label: m.opponent.label } })),
  },
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg[aria-label="Match ratings"]');
    expect(svg?.getAttribute('role')).toBe('img');
  },
};

const VILLA = { id: 'villa', label: 'Aston Villa F.C.', shortLabel: 'Aston Villa' };
const VALENCIA = { id: 'valencia', label: 'Valencia CF', shortLabel: 'Valencia' };

/** Harvey Elliott, 2025-27: `villa` matches on loan at Villa, then `valencia` at Valencia. */
function transferMatches(villa: number, valencia: number): FormChartMatch[] {
  return buildMatches(villa + valencia).map((m, i) => ({
    ...m,
    href: `/game/${m.id}`,
    team: i < villa ? VILLA : VALENCIA,
  }));
}

const clubNames = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('[data-slot="form-club"]')).map((c) => c.textContent);

/**
 * Opens on the six matches at his current club with no club marks; one step
 * earlier widens to the last ten, with a divider where the club changes and
 * each club named over its bars. Later returns to the current club.
 */
export const AcrossATransfer: Story = {
  name: 'Across a transfer: opens on the current club',
  args: { matches: transferMatches(8, 6) },
  decorators: [
    (Story) => (
      <div style={{ width: 358 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const earlier = canvas.getByRole('button', { name: 'Earlier matches' });
    const later = canvas.getByRole('button', { name: 'Later matches' });
    const bars = () => canvasElement.querySelectorAll('[data-slot="form-bar"]').length;

    expect(bars(), 'opens on the six at the current club').toBe(6);
    expect(clubNames(canvasElement), 'one club, nothing extra').toEqual([]);
    expect(later).toBeDisabled();

    await userEvent.click(earlier);
    expect(bars()).toBe(10);
    expect(clubNames(canvasElement)).toEqual(['Aston Villa', 'Valencia']);
    expect(canvasElement.querySelectorAll('[data-slot="form-club-divider"]').length).toBe(1);
    const link = canvas.getAllByRole('link')[0];
    expect(link?.getAttribute('aria-label')).toContain('for Aston Villa F.C.,');

    await userEvent.click(later);
    expect(bars()).toBe(6);
    expect(later).toBeDisabled();
  },
};

/** Fewer than five at the new club: opens on the last ten, divider included. */
export const ShortlyAfterATransfer: Story = {
  name: 'Shortly after a transfer: last ten with a divider',
  args: { matches: transferMatches(8, 3) },
  decorators: [
    (Story) => (
      <div style={{ width: 358 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelectorAll('[data-slot="form-bar"]').length).toBe(10);
    expect(clubNames(canvasElement)).toEqual(['Aston Villa', 'Valencia']);
  },
};
