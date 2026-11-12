import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { MinuteRange, type MinuteRangeMark, type MinuteRangeProps } from './minute-range';
import { ShotMap } from '#/football/blocks/shot-map';
import { Default as ShotMapDefault } from '#/football/blocks/shot-map.stories';
import type { MinuteWindow } from '#/football/lib/selection';

const HOME = '#eb0000';
const AWAY = '#0091eb';

/** Goals in the 2022 final, as track marks. */
const FINAL_GOALS: MinuteRangeMark[] = [
  { minute: 23, color: HOME, label: "Messi 23'" },
  { minute: 36, color: HOME, label: "Di María 36'" },
  { minute: 80, color: AWAY, label: "Mbappé 80'" },
  { minute: 81, color: AWAY, label: "Mbappé 81'" },
  { minute: 108, color: HOME, label: "Messi 108'" },
  { minute: 118, color: AWAY, label: "Mbappé 118'" },
];

/** Holds the value, as a host would, and forwards every call to the story's spies. */
function Controlled(props: MinuteRangeProps) {
  const [value, setValue] = useState<MinuteWindow>(props.value);
  return (
    <MinuteRange
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        props.onChange(next);
      }}
    />
  );
}

const meta = {
  title: 'Football/Primitives/MinuteRange',
  component: MinuteRange,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 360, background: '#0a0a0a', padding: 24 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    value: { from: 20, to: 45 },
    onChange: fn(),
    onCommit: fn(),
  },
  render: (args) => <Controlled {...args} />,
} satisfies Meta<typeof MinuteRange>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Normal time, 0' to 90', no marks. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('group', { name: 'Minute range' })).toBeInTheDocument();
    const from = canvas.getByRole('slider', { name: 'From minute' });
    const to = canvas.getByRole('slider', { name: 'To minute' });
    await expect(from).toHaveAttribute('aria-valuetext', 'Minute 20');
    await expect(to).toHaveAttribute('aria-valuetext', 'Minute 45');
    await expect(canvas.getByText("20'–45'")).toBeInTheDocument();
  },
};

/** Extra time, 0' to 120', with the final's goals marked on the track. */
export const ExtraTimeWithGoals: Story = {
  args: { min: 0, max: 120, value: { from: 75, to: 120 }, marks: FINAL_GOALS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Each mark is listed for screen readers; the ticks themselves are hidden.
    for (const mark of FINAL_GOALS) {
      await expect(canvas.getByText(mark.label)).toBeInTheDocument();
    }
    await expect(canvasElement.querySelectorAll('.btl-mr-mark')).toHaveLength(FINAL_GOALS.length);
  },
};

/**
 * Keyboard: arrows step one minute, Page Up/Down five, Home/End jump to the
 * thumb's limit. Each key press is a change and a commit.
 */
export const Keyboard: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const from = canvas.getByRole('slider', { name: 'From minute' });
    from.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(args.onChange).toHaveBeenLastCalledWith({ from: 21, to: 45 });
    await expect(args.onCommit).toHaveBeenLastCalledWith({ from: 21, to: 45 });
    await userEvent.keyboard('{PageUp}');
    await expect(args.onChange).toHaveBeenLastCalledWith({ from: 26, to: 45 });
    await userEvent.keyboard('{ArrowLeft}{ArrowDown}');
    await expect(args.onChange).toHaveBeenLastCalledWith({ from: 24, to: 45 });
    await userEvent.keyboard('{Home}');
    await expect(args.onChange).toHaveBeenLastCalledWith({ from: 0, to: 45 });
    // End stops one minute short of the other thumb (the minimum gap).
    await userEvent.keyboard('{End}');
    await expect(args.onChange).toHaveBeenLastCalledWith({ from: 44, to: 45 });
    await expect(from).toHaveAttribute('aria-valuetext', 'Minute 44');

    const to = canvas.getByRole('slider', { name: 'To minute' });
    to.focus();
    await userEvent.keyboard('{PageDown}');
    // Can't pass the from thumb: stays at from + 1.
    await expect(args.onChange).toHaveBeenLastCalledWith({ from: 44, to: 45 });
    await userEvent.keyboard('{End}');
    await expect(args.onChange).toHaveBeenLastCalledWith({ from: 44, to: 90 });
  },
};

/** Sets a range input the way a drag does: native value, then `input`, then `change`. */
function drag(input: HTMLElement, value: number) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, String(value));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * A drag never crosses the other thumb and keeps the minimum gap; it reports a
 * change as it moves and one commit when released.
 */
export const DragKeepsGap: Story = {
  args: { minGap: 5 },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const to = canvas.getByRole('slider', { name: 'To minute' });
    drag(to, 10);
    await waitFor(() => expect(args.onChange).toHaveBeenLastCalledWith({ from: 20, to: 25 }));
    await expect(args.onCommit).toHaveBeenCalledTimes(1);
    await expect(args.onCommit).toHaveBeenLastCalledWith({ from: 20, to: 25 });
    await waitFor(() => expect(to).toHaveAttribute('aria-valuetext', 'Minute 25'));
  },
};

/** Clicking the track moves the nearer thumb to that minute. */
export const TrackClick: Story = {
  play: async ({ canvasElement, args }) => {
    const row = canvasElement.querySelector<HTMLElement>('.btl-mr-row');
    if (!row) throw new Error('no track row');
    const rect = row.getBoundingClientRect();
    // Near the right end: the "to" thumb is nearer, so it moves.
    await userEvent.pointer({
      keys: '[MouseLeft]',
      target: row,
      coords: { clientX: rect.right - 8, clientY: rect.top + rect.height / 2 },
    });
    await waitFor(() => expect(args.onCommit).toHaveBeenCalled());
    const last = (args.onCommit as ReturnType<typeof fn>).mock.lastCall?.[0] as MinuteWindow;
    await expect(last.from).toBe(20);
    await expect(last.to).toBeGreaterThanOrEqual(85);
  },
};

/**
 * The reduced-motion media rule must hold real rules. A selector list mixing
 * ::-webkit-slider-thumb and ::-moz-range-thumb is invalid in every browser
 * and is dropped whole, leaving the rule empty.
 */
export const ReducedMotionRulesParse: Story = {
  play: async ({ canvasElement }) => {
    const css = canvasElement.querySelector('style')?.textContent ?? '';
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    const media = Array.from(sheet.cssRules).find(
      (r): r is CSSMediaRule => r instanceof CSSMediaRule && /reduced-motion/.test(r.conditionText)
    );
    if (!media) throw new Error('no reduced-motion media rule');
    // One rule per vendor pseudo-element survives in at least the running engine.
    await expect(media.cssRules.length).toBeGreaterThan(0);
  },
};

/** Disabled: both thumbs are disabled and the track ignores clicks. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const slider of canvas.getAllByRole('slider')) await expect(slider).toBeDisabled();
  },
};

/**
 * The control driving a block: the range goes straight into ShotMap's `window`,
 * so the map and its timeline show only the shots in range.
 */
export const DrivesAShotMap: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 720, background: '#0a0a0a', padding: 24 }}>
        <Story />
      </div>
    ),
  ],
  args: { min: 0, max: 120, value: { from: 0, to: 45 }, marks: FINAL_GOALS },
  render: function Render(args) {
    const [range, setRange] = useState<MinuteWindow>(args.value);
    const shotMapArgs = ShotMapDefault.args as Parameters<typeof ShotMap>[0];
    return (
      <div>
        <MinuteRange
          {...args}
          value={range}
          onChange={(next) => {
            setRange(next);
            args.onChange(next);
          }}
        />
        <ShotMap {...shotMapArgs} window={range} />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const strip = canvas.getByRole('listbox', { name: 'Shots in minute order' });
    const count = () => within(strip).getAllByRole('option').length;
    const firstHalf = count();
    canvas.getByRole('slider', { name: 'To minute' }).focus();
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(count()).toBeGreaterThan(firstHalf));
  },
};
