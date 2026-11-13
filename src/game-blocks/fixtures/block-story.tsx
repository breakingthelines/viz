import type { ReactNode } from 'react';
import { expect } from 'storybook/test';
import { gatedValuesFromJson, toGameBlockConfig } from '../to-config';
import type {
  GameBlockConfig,
  GameBlockDensity,
  GameBlockJson,
  GameBlockLook,
  GameBlockTypeId,
  GatedCellValue,
} from '../types';
import { GameBlockValuesProvider } from '../values';
import { GameBlockMessage, GameBlockView } from '../view';
import { EXAMPLE_CREST } from './media';
import { TEAM_LEAGUE_MATCH_EXAMPLES } from './team-league-match';

/**
 * Shared story scaffolding for the team, manager, league and match blocks.
 * Every story draws an example fixture: EXAMPLE FIGURES ONLY, plausible, not
 * real. Crests, when shown, are a placeholder badge, not a club's.
 */

export type StoryReader = 'pro' | 'free' | 'pending';

export interface BlockStoryArgs {
  look: GameBlockLook;
  reader: StoryReader;
  width: number;
  density: GameBlockDensity;
  media: 'none' | 'crest';
  view?: string;
  title?: string;
  subheading?: string;
}

export const BLOCK_STORY_ARGS: BlockStoryArgs = {
  look: 'editorial',
  reader: 'pro',
  width: 680,
  density: 'article',
  media: 'none',
};

export const BLOCK_STORY_ARG_TYPES = {
  look: { control: 'inline-radio', options: ['editorial', 'poster', 'annotated'] },
  reader: { control: 'inline-radio', options: ['pro', 'free', 'pending'] },
  density: { control: 'inline-radio', options: ['article', 'chat', 'tile'] },
  media: { control: 'inline-radio', options: ['none', 'crest'] },
  width: { control: { type: 'range', min: 320, max: 760, step: 10 } },
} as const;

/** Every `imageUrl` under a fixture's teams and subjects set to the placeholder crest. */
function withCrests<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withCrests) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = withCrests(v);
    const id = typeof out.id === 'string' ? out.id : '';
    if (id.startsWith('team-example-') || /^\d+$/.test(id)) out.imageUrl = EXAMPLE_CREST;
    return out as T;
  }
  return value;
}

export function exampleJson(id: GameBlockTypeId): GameBlockJson {
  const json = TEAM_LEAGUE_MATCH_EXAMPLES[id];
  if (!json) throw new Error(`no example for ${id}`);
  return json;
}

export function exampleConfig(id: GameBlockTypeId): GameBlockConfig {
  const res = toGameBlockConfig(exampleJson(id));
  if (!res.ok) throw new Error(`example ${id} did not map: ${res.reason}`);
  return res.config;
}

/** The example's gated values as a Pro reader gets them, and all locked for a free reader. */
export function exampleValues(id: GameBlockTypeId): {
  pro: Record<string, GatedCellValue>;
  free: Record<string, GatedCellValue>;
} {
  const json = exampleJson(id);
  const pro = gatedValuesFromJson(json.gated);
  const free: Record<string, GatedCellValue> = Object.fromEntries(
    (json.gatedCells ?? Object.keys(pro)).map((k) => [k, { state: 'locked' } as GatedCellValue])
  );
  return { pro, free };
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

/** A story component for one block type. */
export function blockStory(id: GameBlockTypeId) {
  function Block(args: BlockStoryArgs) {
    const json = args.media === 'crest' ? withCrests(exampleJson(id)) : exampleJson(id);
    const res = toGameBlockConfig(json);
    if (!res.ok) return <p>{res.reason}</p>;
    const c = res.config;
    const config: GameBlockConfig = {
      ...c,
      look: args.look,
      title: args.title ?? c.title,
      titleOrigin: args.title ? 'author' : 'default',
      subheading: args.subheading,
      options: { ...c.options, view: args.view ?? c.options.view },
      subject:
        args.media === 'crest' ? { ...c.subject, crestUrl: EXAMPLE_CREST } : { ...c.subject },
    };
    const view = <GameBlockView config={config} density={args.density} />;
    if (args.reader === 'pending') return <Page width={args.width}>{view}</Page>;
    const values = exampleValues(id);
    return (
      <Page width={args.width}>
        <GameBlockValuesProvider
          initial={{ [config.snapshotId]: args.reader === 'pro' ? values.pro : values.free }}
        >
          {view}
        </GameBlockValuesProvider>
      </Page>
    );
  }
  Block.displayName = `Example(${id})`;
  return Block;
}

/** The block as "unavailable": the frame with the builder's one-line reason. */
export function unavailableStory(id: GameBlockTypeId, text: string) {
  return function Unavailable() {
    const c = exampleConfig(id);
    return (
      <Page width={680}>
        <GameBlockMessage title={c.title} context={c.context} text={text} />
      </Page>
    );
  };
}

type Ctx = { canvasElement: HTMLElement; args: BlockStoryArgs };

/** Every look: the BTL colophon, no API-Football mark, the chosen look drawn. */
export async function commonChecks({ canvasElement, args }: Ctx) {
  const root = canvasElement.querySelector('[data-game-block-look]');
  await expect(root?.getAttribute('data-game-block-look')).toBe(args.look);
  await expect(canvasElement.querySelector('[aria-label="Breaking The Lines"]')).not.toBeNull();
  await expect(canvasElement.textContent).not.toContain('API-Football');
}

/** A free reader: any gated cell the example has is locked, with the note, and no paid figure shows. */
export function lockedChecks(id: GameBlockTypeId) {
  return async (ctx: Ctx) => {
    await commonChecks(ctx);
    const { pro } = exampleValues(id);
    const cells = Object.values(pro).filter((v) => v.state === 'value' && v.display);
    if (cells.length === 0) return;
    await expect(ctx.canvasElement.querySelector('[data-cell-state="locked"]')).not.toBeNull();
    await expect(ctx.canvasElement.querySelector('[data-block-locked-note]')).not.toBeNull();
    for (const v of cells) {
      if (/\d\.\d/.test(v.display ?? '')) {
        await expect(ctx.canvasElement.textContent).not.toContain(v.display);
      }
    }
  };
}
