import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  EXAMPLE_ARG_TYPES,
  EXAMPLE_ARGS,
  lockedChecks,
  marksChecks,
  pendingChecks,
  PlayerExample,
  proChecks,
  type ExampleArgs,
} from './story-kit';

/**
 * Player › Career in the three author looks, for a Pro reader, a reader below
 * the plan and before the values land. EXAMPLE FIGURES ONLY: plausible, not
 * real data.
 */

function PlayerCareerExample(args: ExampleArgs) {
  return <PlayerExample id="player-career" {...args} />;
}

const meta = {
  title: 'Game blocks/Player/Career',
  component: PlayerCareerExample,
  parameters: { layout: 'fullscreen' },
  args: EXAMPLE_ARGS,
  argTypes: EXAMPLE_ARG_TYPES,
} satisfies Meta<typeof PlayerCareerExample>;

export default meta;
type Story = StoryObj<typeof meta>;

const F = 'career appearances';

export const Editorial680: Story = { play: proChecks(F) };
export const Editorial390: Story = { args: { width: 390 }, play: proChecks(F) };
export const Poster680: Story = { args: { look: 'poster', media: 'headshot' }, play: proChecks(F) };
export const Poster390: Story = {
  args: { look: 'poster', media: 'headshot', width: 390 },
  play: proChecks(F),
};
export const Annotated680: Story = {
  args: { look: 'annotated' },
  play: async (ctx) => {
    await proChecks(F)(ctx);
    await marksChecks(ctx);
  },
};
export const Annotated390: Story = { args: { look: 'annotated', width: 390 } };
export const Locked680: Story = { args: { reader: 'free' }, play: lockedChecks('player-career') };
export const Locked390: Story = {
  args: { reader: 'free', width: 390, look: 'annotated' },
  play: lockedChecks('player-career'),
};
export const Pending: Story = { args: { reader: 'pending' }, play: pendingChecks };
export const Subheading: Story = { args: { subheading: 'An optional author line' } };
export const Chat: Story = { args: { density: 'chat', width: 420 } };
