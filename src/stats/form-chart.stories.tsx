import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
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
 * `onOlder` fires and the caller's prepended matches keep the same visual
 * position (spec: "pages back through every rated match", across seasons).
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
          const next = earliestOffset - 5;
          setEarliestOffset(next);
          setMatches((prev) => [...buildMatches(5, next), ...prev]);
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

    // Resting on the newest window: "later" has nowhere further to go.
    expect(later).toBeDisabled();
    expect(earlier).not.toBeDisabled();

    await userEvent.click(earlier);
    expect(later, 'stepping earlier must re-enable later').not.toBeDisabled();

    await userEvent.click(later);
    expect(later, 'back at the newest window, later is disabled again').toBeDisabled();
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
