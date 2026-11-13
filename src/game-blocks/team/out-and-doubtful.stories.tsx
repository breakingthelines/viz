import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  BLOCK_STORY_ARGS,
  BLOCK_STORY_ARG_TYPES,
  blockStory,
  commonChecks,
  lockedChecks,
  unavailableStory,
} from '../fixtures/block-story';

/**
 * Team › Out and doubtful in the three author looks. EXAMPLE FIGURES ONLY:
 * plausible, not real. Crests are a placeholder badge.
 */
const Block = blockStory('team-out-and-doubtful');

const meta = {
  title: 'Game blocks/Team/Out and doubtful',
  component: Block,
  parameters: { layout: 'fullscreen' },
  args: BLOCK_STORY_ARGS,
  argTypes: BLOCK_STORY_ARG_TYPES,
} satisfies Meta<typeof Block>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Editorial680: Story = { play: commonChecks };
export const Editorial390: Story = { args: { width: 390 }, play: commonChecks };
export const Poster680: Story = { args: { look: 'poster', media: 'crest' }, play: commonChecks };
export const Poster390: Story = {
  args: { look: 'poster', media: 'crest', width: 390 },
  play: commonChecks,
};
export const PosterNoImage: Story = { args: { look: 'poster' }, play: commonChecks };
export const Annotated680: Story = { args: { look: 'annotated' }, play: commonChecks };
export const Annotated390: Story = { args: { look: 'annotated', width: 390 }, play: commonChecks };
export const WithCrests: Story = { args: { media: 'crest' }, play: commonChecks };
export const Locked: Story = {
  args: { reader: 'free' },
  play: lockedChecks('team-out-and-doubtful'),
};
export const LockedPoster: Story = {
  args: { reader: 'free', look: 'poster' },
  play: lockedChecks('team-out-and-doubtful'),
};
export const Pending: Story = { args: { reader: 'pending' } };
export const CustomTitleAndSubheading: Story = {
  args: { title: 'A title the author typed', subheading: 'An optional subheading' },
};
export const Chat: Story = { args: { density: 'chat', width: 420 } };
export const Unavailable: Story = {
  render: unavailableStory('team-out-and-doubtful', 'Not covered for this competition'),
};
