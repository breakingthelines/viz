import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
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

type Play = (ctx: { canvasElement: HTMLElement }) => Promise<void>;

/**
 * Player › Season totals, the season card: the poster (its default), the
 * wheel it draws when there is no cut-out, editorial and annotated, for a Pro reader, a reader below the plan and before the values
 * land. EXAMPLE FIGURES ONLY: plausible, not real data.
 */

function PlayerSeasonTotalsExample(args: ExampleArgs) {
  return <PlayerExample id="player-season-totals" {...args} />;
}

const meta = {
  title: 'Game blocks/Player/Season totals',
  component: PlayerSeasonTotalsExample,
  parameters: { layout: 'fullscreen' },
  args: EXAMPLE_ARGS,
  argTypes: EXAMPLE_ARG_TYPES,
} satisfies Meta<typeof PlayerSeasonTotalsExample>;

export default meta;
type Story = StoryObj<typeof meta>;

const F = 'vs Premier League wingers';

/** The poster with no cut-out draws his wheel, never a crest or empty wedges. */
const wheelFallbackChecks: Play = async ({ canvasElement }) => {
  await waitFor(
    () => expect(canvasElement.querySelector('[data-season-fallback="wheel"]')).not.toBeNull(),
    { timeout: 4000 }
  );
  await expect(canvasElement.querySelector('path.btl-pw-slc')).not.toBeNull();
  await expect(canvasElement.querySelector('[data-poster-media]')).toBeNull();
  await expect(canvasElement.querySelector('[data-median]')).toBeNull();
  await expect(canvasElement.querySelector('.btl-pw-tip')).toBeNull();
};

/** No ranks, ordinals, medians, counts or appearances anywhere. */
const plainLabelChecks: Play = async ({ canvasElement }) => {
  const text = canvasElement.textContent ?? '';
  await expect(text).not.toMatch(/\d(st|nd|rd|th)\b/);
  await expect(text).not.toContain('Median');
  await expect(text).not.toContain('Per 90 ');
  await expect(text).not.toContain('apps');
  await expect(canvasElement.querySelector('[data-scale-median]')).toBeNull();
};

export const Editorial680: Story = {
  args: { look: 'editorial' },
  play: async (ctx) => {
    await proChecks(F)(ctx);
    await plainLabelChecks(ctx);
  },
};
export const Editorial390: Story = { args: { look: 'editorial', width: 390 }, play: proChecks(F) };
export const Poster680: Story = {
  args: { look: 'poster', media: 'headshot' },
  play: async (ctx) => {
    await proChecks(F)(ctx);
    await plainLabelChecks(ctx);
  },
};
export const Poster390: Story = {
  args: { look: 'poster', media: 'headshot', width: 390 },
  play: proChecks(F),
};
/** A crest but no cut-out: the wheel, not the crest poster. */
export const PosterCrestDrawsWheel680: Story = {
  args: { look: 'poster', media: 'crest' },
  play: async (ctx) => {
    await wheelFallbackChecks(ctx);
    await plainLabelChecks(ctx);
  },
};
export const PosterCrestDrawsWheel390: Story = {
  args: { look: 'poster', media: 'crest', width: 390 },
  play: wheelFallbackChecks,
};
export const PosterCrestDrawsWheelChat: Story = {
  args: { look: 'poster', media: 'crest', density: 'chat', width: 420 },
  play: wheelFallbackChecks,
};
/** No headshot and no crest: the wheel. */
export const PosterNoImage: Story = {
  args: { look: 'poster', media: 'none' },
  play: wheelFallbackChecks,
};
/** A headshot and crest that fail to load: the wheel too. */
export const PosterBrokenImages: Story = {
  args: { look: 'poster', media: 'broken' },
  play: wheelFallbackChecks,
};
export const Annotated680: Story = {
  args: { look: 'annotated' },
  play: async (ctx) => {
    await proChecks(F)(ctx);
    await marksChecks(ctx);
  },
};
export const Annotated390: Story = { args: { look: 'annotated', width: 390 } };
export const Locked680: Story = {
  args: { reader: 'free' },
  play: lockedChecks('player-season-totals', '0.52'),
};
export const Locked390: Story = {
  args: { reader: 'free', width: 390, look: 'annotated' },
  play: lockedChecks('player-season-totals', '0.52'),
};
export const Pending: Story = { args: { reader: 'pending' }, play: pendingChecks };
export const Subheading: Story = { args: { subheading: 'An optional author line' } };
export const Chat: Story = { args: { density: 'chat', width: 420 } };
export const KeyPassesHighlight: Story = { args: { highlight: 'key_passes' } };
