import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import totalsJson from '../fixtures/player-comparison-totals.example.json';
import { gatedValuesFromJson, toGameBlockConfig } from '../to-config';
import type { GameBlockJson } from '../types';
import { GameBlockValuesProvider } from '../values';
import { GameBlockView } from '../view';
import {
  EXAMPLE_ARG_TYPES,
  EXAMPLE_ARGS,
  lockedChecks,
  marksChecks,
  pendingChecks,
  Page,
  PlayerExample,
  proChecks,
  comparisonViewChecks,
  type ExampleArgs,
} from './story-kit';

/**
 * Player › Comparison in the three author looks, for a Pro reader, a reader below
 * the plan and before the values land. EXAMPLE FIGURES ONLY: plausible, not
 * real data.
 */

function PlayerComparisonExample(args: ExampleArgs) {
  return <PlayerExample id="player-comparison" {...args} />;
}

const meta = {
  title: 'Game blocks/Player/Comparison',
  component: PlayerComparisonExample,
  parameters: { layout: 'fullscreen' },
  args: EXAMPLE_ARGS,
  argTypes: EXAMPLE_ARG_TYPES,
} satisfies Meta<typeof PlayerComparisonExample>;

export default meta;
type Story = StoryObj<typeof meta>;

const F = 'Foden';

// The scales view keeps the hero and the per 90 cells.
const scales = { view: 'scales' };

export const Wheel680: Story = { play: comparisonViewChecks('wheel') };
export const Wheel390: Story = { args: { width: 390 }, play: comparisonViewChecks('wheel') };
export const WheelChat: Story = {
  args: { density: 'chat', width: 360 },
  play: comparisonViewChecks('wheel'),
};
export const Differ680: Story = {
  args: { view: 'differ' },
  play: async (ctx) => {
    await comparisonViewChecks('differ')(ctx);
    await marksChecks(ctx);
  },
};
export const DifferChat: Story = { args: { view: 'differ', density: 'chat', width: 360 } };
export const Bars680: Story = { args: { view: 'bars' }, play: comparisonViewChecks('bars') };
export const BarsChat: Story = { args: { view: 'bars', density: 'chat', width: 360 } };
export const Strip680: Story = { args: { view: 'strip' }, play: comparisonViewChecks('strip') };
export const StripChat: Story = { args: { view: 'strip', density: 'chat', width: 360 } };
export const TwoWheels680: Story = {
  args: { view: 'two_wheels' },
  play: comparisonViewChecks('two_wheels'),
};
export const TwoWheelsChat: Story = { args: { view: 'two_wheels', density: 'chat', width: 360 } };
export const Duel680: Story = {
  args: { view: 'duel', media: 'headshot' },
  play: comparisonViewChecks('duel'),
};
export const DuelChat: Story = {
  args: { view: 'duel', media: 'headshot', density: 'chat', width: 360 },
  play: comparisonViewChecks('duel'),
};
/** No picture for either player: the duel draws the wheel, never a crest. */
export const DuelFallback: Story = {
  args: { view: 'duel', media: 'none' },
  play: comparisonViewChecks('wheel'),
};
export const Editorial680: Story = { args: scales, play: proChecks(F) };
export const Editorial390: Story = { args: { ...scales, width: 390 }, play: proChecks(F) };
export const Poster680: Story = {
  args: { look: 'poster', media: 'headshot' },
  play: comparisonViewChecks('duel'),
};
export const Poster390: Story = {
  args: { look: 'poster', media: 'headshot', width: 390 },
  play: comparisonViewChecks('duel'),
};
export const Annotated680: Story = {
  args: { ...scales, look: 'annotated' },
  play: async (ctx) => {
    await proChecks(F)(ctx);
    await marksChecks(ctx);
  },
};
export const Annotated390: Story = { args: { ...scales, look: 'annotated', width: 390 } };
export const Locked680: Story = {
  args: { ...scales, reader: 'free' },
  play: lockedChecks('player-comparison', '2.62'),
};
export const Locked390: Story = {
  args: { ...scales, reader: 'free', width: 390, look: 'annotated' },
  play: lockedChecks('player-comparison', '2.62'),
};
export const Pending: Story = { args: { reader: 'pending' }, play: pendingChecks };
export const Subheading: Story = { args: { subheading: 'An optional author line' } };
export const Chat: Story = { args: { ...scales, density: 'chat', width: 420 } };
export const RowsView: Story = { args: { view: 'rows' }, play: proChecks('2.62') };

/** Two players the cards cannot rank together: season totals and per 90, no scales. */
function TotalsExample({ width, look }: { width: number; look: ExampleArgs['look'] }) {
  const json = totalsJson as unknown as GameBlockJson;
  const res = toGameBlockConfig(json);
  if (!res.ok) throw new Error(res.reason);
  return (
    <Page width={width}>
      <GameBlockValuesProvider
        initial={{ [res.config.snapshotId]: gatedValuesFromJson(json.gated) }}
      >
        <GameBlockView config={{ ...res.config, look }} />
      </GameBlockValuesProvider>
    </Page>
  );
}

const totalsChecks: Story['play'] = async ({ canvasElement }) => {
  await expect(canvasElement.querySelector('[data-comparison-totals]')).not.toBeNull();
  await expect(canvasElement.querySelector('[data-scale-comparator]')).toBeNull();
  await expect(canvasElement.textContent).toContain('Messi');
};

export const Totals680: Story = {
  render: (args) => <TotalsExample width={args.width} look={args.look} />,
  play: totalsChecks,
};
export const Totals390: Story = {
  args: { width: 390 },
  render: (args) => <TotalsExample width={args.width} look={args.look} />,
  play: totalsChecks,
};
