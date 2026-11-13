import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { WHEEL_EXAMPLE } from '../fixtures/index';
import { EXAMPLE_CREST, syntheticHeadshot } from '../fixtures/media';
import { gatedValuesFromJson, toGameBlockConfig } from '../to-config';
import type { GameBlockConfig, GameBlockDensity, GameBlockLook, GatedCellValue } from '../types';
import { GameBlockValuesProvider, type GameBlockValuesMap } from '../values';
import { GameBlockView } from '../view';

/**
 * Player › Percentile wheel in the three author looks. EXAMPLE FIGURES ONLY:
 * plausible, not real data. The headshot is a drawn bust, not a person.
 */

function base(): GameBlockConfig {
  const res = toGameBlockConfig(WHEEL_EXAMPLE);
  if (!res.ok) throw new Error('fixture did not map');
  return res.config;
}

const PRO = gatedValuesFromJson(WHEEL_EXAMPLE.gated);
const FREE: Record<string, GatedCellValue> = Object.fromEntries(
  Object.keys(PRO).map((k) => [k, { state: 'locked' }])
);

type Reader = 'pro' | 'free' | 'pending';

interface Args {
  look: GameBlockLook;
  reader: Reader;
  width: number;
  density: GameBlockDensity;
  title?: string;
  subheading?: string;
  view?: string;
  media?: 'none' | 'headshot' | 'crest';
}

function Page({ width, children }: { width: number; children: ReactNode }) {
  return (
    <div
      style={{
        width,
        maxWidth: '100vw',
        margin: '0 auto',
        padding: width < 500 ? '20px 16px' : '28px 0',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
}

function Block(args: Args) {
  const c = base();
  const config: GameBlockConfig = {
    ...c,
    look: args.look,
    title: args.title ?? c.title,
    titleOrigin: args.title ? 'author' : 'default',
    subheading: args.subheading,
    options: { ...c.options, view: args.view ?? c.options.view },
    subject: {
      ...c.subject,
      imageUrl: args.media === 'headshot' ? syntheticHeadshot() : undefined,
      crestUrl: args.media === 'headshot' || args.media === 'crest' ? EXAMPLE_CREST : undefined,
    },
  };
  const view = <GameBlockView config={config} density={args.density} />;
  if (args.reader === 'pending') return <Page width={args.width}>{view}</Page>;
  const values: GameBlockValuesMap = { [config.snapshotId]: args.reader === 'pro' ? PRO : FREE };
  return (
    <Page width={args.width}>
      <GameBlockValuesProvider initial={values}>{view}</GameBlockValuesProvider>
    </Page>
  );
}

const meta = {
  title: 'Game blocks/Player/Percentile wheel',
  component: Block,
  parameters: { layout: 'fullscreen' },
  args: { look: 'editorial', reader: 'pro', width: 680, density: 'article', media: 'none' },
  argTypes: {
    look: { control: 'inline-radio', options: ['editorial', 'poster', 'annotated'] },
    reader: { control: 'inline-radio', options: ['pro', 'free', 'pending'] },
    density: { control: 'inline-radio', options: ['article', 'chat', 'tile'] },
    media: { control: 'inline-radio', options: ['none', 'headshot', 'crest'] },
    width: { control: { type: 'range', min: 320, max: 760, step: 10 } },
  },
} satisfies Meta<typeof Block>;

export default meta;
type Story = StoryObj<typeof meta>;

const proChecks: Story['play'] = async ({ canvasElement }) => {
  const c = within(canvasElement);
  await expect(c.getAllByText('2.62').length).toBeGreaterThan(0);
  await expect(canvasElement.querySelector('[data-block-locked-note]')).toBeNull();
  await expect(canvasElement.textContent).not.toContain('API-Football');
  await expect(c.getByLabelText('Breaking The Lines')).toBeTruthy();
};

const freeChecks: Story['play'] = async ({ canvasElement }) => {
  await expect(canvasElement.textContent).not.toContain('2.62');
  await expect(canvasElement.querySelector('[data-cell-state="locked"]')).not.toBeNull();
  await expect(canvasElement.querySelector('[data-block-locked-note]')?.textContent).toContain(
    'Per 90 figures are for Pro readers.'
  );
};

export const Editorial680: Story = { play: proChecks };
export const Editorial390: Story = { args: { width: 390 }, play: proChecks };
export const EditorialFree680: Story = { args: { reader: 'free' }, play: freeChecks };
export const EditorialFree390: Story = { args: { reader: 'free', width: 390 }, play: freeChecks };

export const Poster680: Story = {
  args: { look: 'poster', media: 'headshot' },
  play: async (ctx) => {
    await proChecks(ctx);
    await waitFor(
      () =>
        expect(ctx.canvasElement.querySelector('[data-poster-media="halftone"]')).not.toBeNull(),
      { timeout: 4000 }
    );
  },
};
export const Poster390: Story = {
  args: { look: 'poster', media: 'headshot', width: 390 },
  play: proChecks,
};
export const PosterFree680: Story = {
  args: { look: 'poster', reader: 'free', media: 'headshot' },
  play: freeChecks,
};
export const PosterCrestFallback: Story = {
  args: { look: 'poster', media: 'crest' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-poster-media="crest"]')).not.toBeNull();
  },
};
export const PosterNumberOnly: Story = {
  args: { look: 'poster', media: 'none' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-poster-media]')).toBeNull();
  },
};

const annotatedChecks: Story['play'] = async (ctx) => {
  await waitFor(
    () => expect(ctx.canvasElement.querySelector('[data-block-marks]')).not.toBeNull(),
    { timeout: 4000 }
  );
};
export const Annotated680: Story = {
  args: { look: 'annotated' },
  play: async (ctx) => {
    await proChecks(ctx);
    await annotatedChecks(ctx);
  },
};
export const Annotated390: Story = {
  args: { look: 'annotated', width: 390 },
  play: annotatedChecks,
};
export const AnnotatedFree680: Story = {
  args: { look: 'annotated', reader: 'free' },
  play: async (ctx) => {
    await freeChecks(ctx);
    await annotatedChecks(ctx);
  },
};

export const CustomTitleAndSubheading: Story = {
  args: {
    title: 'Saka makes Arsenal tick',
    subheading: 'Creating more than any winger in the league',
  },
};
export const WheelAndRows: Story = { args: { view: 'wheel_rows' } };
export const RowsOnly: Story = { args: { view: 'rows', reader: 'free' } };
export const Chat: Story = { args: { density: 'chat', width: 420 } };
export const Tile: Story = { args: { density: 'tile', width: 320 } };

/** Server render and first client render: paid cells pending, no locked note. */
export const Pending: Story = {
  args: { reader: 'pending' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-cell-state="pending"]')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-block-locked-note]')).toBeNull();
  },
};

/** A block this build cannot draw (a newer data version). */
export const Unavailable: Story = {
  render: () => (
    <Page width={680}>
      <GameBlockView config={{ ...base(), dataVersion: 99 }} />
    </Page>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain('Update to see this block');
  },
};

const fetchValues = fn(
  async (ids: string[]) => Object.fromEntries(ids.map((id) => [id, PRO])) as GameBlockValuesMap
);

/** Two blocks on one page: one batched read for both snapshots. */
export const BatchedRead: Story = {
  render: () => {
    const c = base();
    return (
      <Page width={680}>
        <GameBlockValuesProvider fetchValues={fetchValues}>
          <GameBlockView config={{ ...c, snapshotId: 'snap-a' }} />
          <div style={{ height: 32 }} />
          <GameBlockView config={{ ...c, snapshotId: 'snap-b', look: 'annotated' }} />
        </GameBlockValuesProvider>
      </Page>
    );
  },
  beforeEach: () => {
    fetchValues.mockClear();
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(within(canvasElement).getAllByText('2.62').length).toBe(2));
    await expect(fetchValues).toHaveBeenCalledTimes(1);
    await expect([...fetchValues.mock.calls[0][0]].sort()).toEqual(['snap-a', 'snap-b']);
  },
};

/** No session: locked at once, nothing fetched. */
export const Anonymous: Story = {
  render: () => {
    const spy = fn(async () => ({}) as GameBlockValuesMap);
    return (
      <Page width={680}>
        <GameBlockValuesProvider signedIn={false} fetchValues={spy}>
          <GameBlockView config={base()} />
        </GameBlockValuesProvider>
      </Page>
    );
  },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-block-locked-note]')).not.toBeNull()
    );
    await expect(canvasElement.textContent).not.toContain('2.62');
  },
};
