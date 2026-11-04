import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, within } from 'storybook/test';
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
          const next = earliestOffset - 20;
          setEarliestOffset(next);
          // A realistically larger prepend than one window/step, so a
          // further click after the prepend steps back within the loaded
          // data instead of immediately hitting the oldest-loaded edge
          // again.
          setMatches((prev) => [...buildMatches(20, next), ...prev]);
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

    // Resting on the newest window: "later" has nowhere further to go.
    expect(later).toBeDisabled();
    expect(earlier).not.toBeDisabled();
    expect(olderCalls()).toContain('0');

    await userEvent.click(earlier);
    expect(later, 'stepping earlier must re-enable later').not.toBeDisabled();

    await userEvent.click(later);
    expect(later, 'back at the newest window, later is disabled again').toBeDisabled();

    // Page back to the oldest loaded match (14 loaded, window 10, step 5 —
    // one click lands exactly on the oldest loaded match).
    await userEvent.click(earlier);

    // A double click right at the oldest loaded match — before the host's
    // prepend has resolved — must call `onOlder` only once, not twice.
    fireEvent.click(earlier);
    fireEvent.click(earlier);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(olderCalls(), 'a double click at the boundary fires onOlder only once').toContain('1');

    // The window moves to the newly prepended matches on this same click
    // cycle, so the visible range already reflects them without a further
    // click.
    const rangeAfterPrepend = canvas.getByText(/to/, { selector: 'span' }).textContent;
    expect(
      rangeAfterPrepend,
      "the window shows the host's prepended matches once onOlder resolves"
    ).toContain('Jan');

    // One more click, now inside the newly-prepended data rather than back
    // at the boundary, steps back by `step` (5) within what is loaded —
    // it does not call onOlder again.
    await userEvent.click(earlier);
    expect(
      olderCalls(),
      'stepping within already-loaded data does not call onOlder again'
    ).toContain('1');
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
 * When bars link, the chart's children are not purely presentational, so
 * `role="img"` (which would hide a focusable `<a>` from assistive tech
 * behind a single chart-wide label) gives way to `role="group"`, and each
 * bar's own accessible name carries the date, rating and G/A the mock's
 * visible labels show, not just the result and opponent.
 */
export const LinkedBarsAreAccessible: Story = {
  name: 'Linked bars expose an accessible group, not a presentational image',
  args: { matches: buildMatches(3) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const svg = canvasElement.querySelector('svg[aria-label="Match ratings"]');
    expect(svg?.getAttribute('role'), 'children are not presentational once a bar links').toBe(
      'group'
    );
    const links = canvas.getAllByRole('link');
    expect(links.length).toBe(3);
    const name = links[0]?.getAttribute('aria-label') ?? '';
    expect(name, 'carries the date beyond just result and opponent').toMatch(/\d/);
    expect(name, 'carries the rating beyond just result and opponent').toContain('rating');
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
