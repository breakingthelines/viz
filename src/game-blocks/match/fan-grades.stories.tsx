import type { Meta, StoryObj } from '@storybook/react-vite';
import { GameBlockView } from '../view';
import {
  BLOCK_STORY_ARGS,
  BLOCK_STORY_ARG_TYPES,
  blockStory,
  commonChecks,
  exampleConfig,
  lockedChecks,
  unavailableStory,
} from '../fixtures/block-story';
import { expect } from 'storybook/test';
import type { MatchFanGradesDataJson } from './types';

/**
 * Match › Fan grades in the three author looks. EXAMPLE FIGURES ONLY:
 * plausible, not real. Crests are a placeholder badge.
 */
const Block = blockStory('match-fan-grades');

const meta = {
  title: 'Game blocks/Match/Fan grades',
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
export const Locked: Story = { args: { reader: 'free' }, play: lockedChecks('match-fan-grades') };
export const LockedPoster: Story = {
  args: { reader: 'free', look: 'poster' },
  play: lockedChecks('match-fan-grades'),
};
export const Pending: Story = { args: { reader: 'pending' } };
export const CustomTitleAndSubheading: Story = {
  args: { title: 'A title the author typed', subheading: 'An optional subheading' },
};
export const Chat: Story = { args: { density: 'chat', width: 420 } };
export const ListView: Story = { args: { view: 'list' }, play: commonChecks };
export const Unavailable: Story = {
  render: unavailableStory('match-fan-grades', 'Not played yet'),
};

/**
 * One reader grade in the whole match, the shape seen in a chat answer: the
 * hero reads "1 vote" and the side nobody graded is left out, header and all.
 */
export const OneVote: Story = {
  render: () => {
    const c = exampleConfig('match-fan-grades');
    const data = c.data as MatchFanGradesDataJson;
    const ungraded = (p: NonNullable<MatchFanGradesDataJson['home']>[number]) => ({
      ...p,
      grade: undefined,
      votes: 0,
    });
    const config = {
      ...c,
      data: {
        ...data,
        home: (data.home ?? []).map(ungraded),
        away: (data.away ?? []).map((p, i) =>
          i === 0 ? { ...p, grade: 3, votes: 1 } : ungraded(p)
        ),
        homeAverage: undefined,
        awayAverage: 3,
      },
    };
    return (
      <div style={{ width: 680, margin: '0 auto', padding: '28px 0' }}>
        <GameBlockView config={config} />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const t = canvasElement.textContent ?? '';
    await expect(t).toContain('1 vote');
    await expect(t).not.toContain('1 votes');
    await expect(t).not.toContain('Arsenal, 4-3-3');
  },
};
