import type { ReactNode } from 'react';
import { expect, waitFor } from 'storybook/test';
import { EXAMPLE_CREST, syntheticHeadshot } from '../fixtures/media';
import { PLAYER_EXAMPLES, type PlayerExampleId } from '../fixtures/player';
import { gatedValuesFromJson, toGameBlockConfig } from '../to-config';
import type { GameBlockConfig, GameBlockDensity, GameBlockLook, GatedCellValue } from '../types';
import { GameBlockValuesProvider, type GameBlockValuesMap } from '../values';
import { GameBlockView } from '../view';

/**
 * Shared story parts for the player blocks. EXAMPLE FIGURES ONLY: plausible,
 * not real data. The headshot is a drawn bust, not a person.
 */

export type Reader = 'pro' | 'free' | 'pending';

export interface ExampleArgs {
  look: GameBlockLook;
  reader: Reader;
  width: number;
  density: GameBlockDensity;
  /** `broken`: a headshot and crest that never load. */
  media: 'none' | 'headshot' | 'crest' | 'broken';
  title?: string;
  subheading?: string;
  view?: string;
  highlight?: string;
}

export function exampleConfig(id: PlayerExampleId): GameBlockConfig {
  const res = toGameBlockConfig(PLAYER_EXAMPLES[id]);
  if (!res.ok) throw new Error(`${id} fixture did not map`);
  return res.config;
}

/** The example's gated map as Pro sees it, or every cell locked. */
export function exampleValues(id: PlayerExampleId, reader: 'pro' | 'free') {
  const pro = gatedValuesFromJson(PLAYER_EXAMPLES[id].gated);
  if (reader === 'pro') return pro;
  return Object.fromEntries(Object.keys(pro).map((k) => [k, { state: 'locked' }])) as Record<
    string,
    GatedCellValue
  >;
}

export function Page({ width, children }: { width: number; children: ReactNode }) {
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

export function PlayerExample({ id, ...args }: ExampleArgs & { id: PlayerExampleId }) {
  const c = exampleConfig(id);
  const config: GameBlockConfig = {
    ...c,
    look: args.look,
    title: args.title ?? c.title,
    titleOrigin: args.title ? 'author' : 'default',
    subheading: args.subheading,
    options: {
      ...c.options,
      view: args.view ?? c.options.view,
      highlight: args.highlight ?? c.options.highlight,
    },
    subject: {
      ...c.subject,
      imageUrl:
        args.media === 'headshot'
          ? syntheticHeadshot()
          : args.media === 'broken'
            ? BROKEN_IMAGE
            : undefined,
      crestUrl:
        args.media === 'headshot' || args.media === 'crest'
          ? EXAMPLE_CREST
          : args.media === 'broken'
            ? BROKEN_IMAGE
            : undefined,
    },
  };
  const view = <GameBlockView config={config} density={args.density} />;
  if (args.reader === 'pending') return <Page width={args.width}>{view}</Page>;
  const values: GameBlockValuesMap = { [config.snapshotId]: exampleValues(id, args.reader) };
  return (
    <Page width={args.width}>
      <GameBlockValuesProvider initial={values}>{view}</GameBlockValuesProvider>
    </Page>
  );
}

export const EXAMPLE_ARGS: ExampleArgs = {
  look: 'editorial',
  reader: 'pro',
  width: 680,
  density: 'article',
  media: 'none',
};

export const EXAMPLE_ARG_TYPES = {
  look: { control: 'inline-radio', options: ['editorial', 'poster', 'annotated'] },
  reader: { control: 'inline-radio', options: ['pro', 'free', 'pending'] },
  density: { control: 'inline-radio', options: ['article', 'chat', 'tile'] },
  media: { control: 'inline-radio', options: ['none', 'headshot', 'crest', 'broken'] },
  width: { control: { type: 'range', min: 320, max: 760, step: 10 } },
} as const;

type Play = (ctx: { canvasElement: HTMLElement }) => Promise<void>;

/** Title, the BTL mark, no provider credit, and one figure the block must show. */
export function proChecks(figure: string): Play {
  return async ({ canvasElement }) => {
    // Poster sets the hero label in sentence case, so compare without case.
    await expect(canvasElement.textContent?.toLowerCase()).toContain(figure.toLowerCase());
    await expect(canvasElement.querySelector('[aria-label="Breaking The Lines"]')).not.toBeNull();
    await expect(canvasElement.textContent).not.toContain('API-Football');
    await expect(canvasElement.textContent).not.toContain('Update to see this block');
  };
}

/**
 * A reader below the plan: with gated cells the paid figure is gone and the
 * locked note shows; with none the block is unchanged and no note shows.
 */
export function lockedChecks(id: PlayerExampleId, paidFigure?: string): Play {
  const gated = Object.keys(PLAYER_EXAMPLES[id].gated ?? {}).length > 0;
  return async ({ canvasElement }) => {
    if (!gated) {
      await expect(canvasElement.querySelector('[data-block-locked-note]')).toBeNull();
      return;
    }
    if (paidFigure) await expect(canvasElement.textContent).not.toContain(paidFigure);
    await expect(canvasElement.querySelector('[data-cell-state="locked"]')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-block-locked-note]')).not.toBeNull();
  };
}

export const pendingChecks: Play = async ({ canvasElement }) => {
  await expect(canvasElement.querySelector('[data-block-locked-note]')).toBeNull();
  await expect(canvasElement.querySelector('[data-cell-state="locked"]')).toBeNull();
};

/** An image URL that never loads. */
const BROKEN_IMAGE = 'data:image/png;base64,AAAA';

/** A poster with no usable headshot leads with the crest in the cut-out position. */
export const crestPosterChecks: Play = async ({ canvasElement }) => {
  await waitFor(
    () => expect(canvasElement.querySelector('[data-poster-media="crest"]')).not.toBeNull(),
    { timeout: 4000 }
  );
  await expect(canvasElement.querySelector('[data-game-block-look="poster"]')).not.toBeNull();
};

/** A poster with no usable headshot or crest draws as editorial, never empty wedges. */
export const editorialFallbackChecks: Play = async ({ canvasElement }) => {
  await waitFor(
    () =>
      expect(
        canvasElement.querySelector('[data-game-block-look-fallback="poster"]')
      ).not.toBeNull(),
    { timeout: 4000 }
  );
  await expect(canvasElement.querySelector('[data-game-block-look="editorial"]')).not.toBeNull();
  await expect(canvasElement.querySelector('[data-poster-media]')).toBeNull();
};

/** The annotated look's crayon layer lands once fonts settle. */
export const marksChecks: Play = async ({ canvasElement }) => {
  await waitFor(() => expect(canvasElement.querySelector('[data-block-marks]')).not.toBeNull(), {
    timeout: 4000,
  });
};
