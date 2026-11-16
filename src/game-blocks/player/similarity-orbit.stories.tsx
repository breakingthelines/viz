import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import { syntheticHeadshot } from '../fixtures/media';
import { PLAYER_EXAMPLES, PLAYER_ORBIT_PAIR_EXAMPLE } from '../fixtures/player';
import { toGameBlockConfig } from '../to-config';
import type { GameBlockConfig, GameBlockDensity, GameBlockJson, GameBlockLook } from '../types';
import { GameBlockView } from '../view';
import type { GameBlockOrbitJson, PlayerSimilarityOrbitDataJson } from './data';
import { Page } from './story-kit';

/**
 * Player › Similarity orbit, one player and a pair, in an article, in chat and
 * as a still picker tile. EXAMPLE FIGURES ONLY: the ranks are made up, and
 * the faces are drawn busts, not people.
 */

interface OrbitArgs {
  pair: boolean;
  look: GameBlockLook;
  width: number;
  density: GameBlockDensity;
}

/** Faces get a drawn bust, so no story reaches the CDN. */
function withBusts(o: GameBlockOrbitJson): GameBlockOrbitJson {
  const bust = syntheticHeadshot();
  return {
    ...o,
    anchor: { ...o.anchor, imageUrl: bust },
    members: (o.members ?? []).map((m) =>
      m.player?.url ? { ...m, player: { ...m.player, imageUrl: bust } } : m
    ),
  };
}

function exampleConfig(json: GameBlockJson): GameBlockConfig<PlayerSimilarityOrbitDataJson> {
  const res = toGameBlockConfig(json);
  if (!res.ok) throw new Error('orbit fixture did not map');
  const c = res.config as GameBlockConfig<PlayerSimilarityOrbitDataJson>;
  return { ...c, data: { ...c.data, orbits: (c.data.orbits ?? []).map(withBusts) } };
}

function OrbitExample({ pair, look, width, density }: OrbitArgs) {
  const c = exampleConfig(
    pair ? PLAYER_ORBIT_PAIR_EXAMPLE : PLAYER_EXAMPLES['player-similarity-orbit']
  );
  return (
    <Page width={width}>
      <GameBlockView config={{ ...c, look } as unknown as GameBlockConfig} density={density} />
    </Page>
  );
}

const meta = {
  title: 'Game blocks/Player/Similarity orbit',
  component: OrbitExample,
  parameters: { layout: 'fullscreen' },
  args: { pair: false, look: 'editorial', width: 680, density: 'article' },
  argTypes: {
    look: { control: 'inline-radio', options: ['editorial', 'poster', 'annotated'] },
    density: { control: 'inline-radio', options: ['article', 'chat', 'tile'] },
    width: { control: { type: 'range', min: 320, max: 760, step: 10 } },
  },
} satisfies Meta<typeof OrbitExample>;

export default meta;
type Story = StoryObj<typeof meta>;

type Play = (ctx: { canvasElement: HTMLElement }) => Promise<void>;

const frameChecks: Play = async ({ canvasElement }) => {
  await expect(canvasElement.querySelector('[aria-label="Breaking The Lines"]')).not.toBeNull();
  await expect(canvasElement.textContent).not.toContain('API-Football');
  await expect(canvasElement.textContent).not.toContain('Update to see this block');
};

const pairChecks: Play = async (ctx) => {
  await frameChecks(ctx);
  const text = ctx.canvasElement.textContent ?? '';
  await expect(text).toContain('Different profiles');
  await expect(text).toContain('Only Mbappé:');
  await expect(text).toContain('Similar:Shooting');
  await expect(text).toContain('Different:Dribbling, Creating');
};

export const Single680: Story = { play: frameChecks };
export const Single390: Story = { args: { width: 390 }, play: frameChecks };
export const SingleChat: Story = { args: { density: 'chat', width: 420 }, play: frameChecks };
export const SingleTile: Story = {
  args: { density: 'tile', width: 320 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[role="group"]')).toBeNull();
    await expect(canvasElement.querySelector('[role="img"]')).not.toBeNull();
  },
};
export const SinglePoster680: Story = { args: { look: 'poster' }, play: frameChecks };
export const SingleAnnotated680: Story = { args: { look: 'annotated' }, play: frameChecks };

export const Pair680: Story = { args: { pair: true }, play: pairChecks };
export const Pair390: Story = { args: { pair: true, width: 390 }, play: pairChecks };
export const PairChat: Story = {
  args: { pair: true, density: 'chat', width: 420 },
  play: pairChecks,
};
export const PairTile: Story = {
  args: { pair: true, density: 'tile', width: 320 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[role="group"]')).toBeNull();
    const labels = [...canvasElement.querySelectorAll('[role="img"]')].map((e) =>
      e.getAttribute('aria-label')
    );
    await expect(labels).toContain(
      'Erling Haaland is joint 85th closest of the 157 other strikers to Kylian Mbappé. Closest: Donyell Malen.'
    );
  },
};

/** A tap on a face opens the strip: name, club, place, his page and the comparison pages. */
export const VerifyTapOpensStrip: Story = {
  args: { pair: true },
  play: async ({ canvasElement }) => {
    const face = await waitFor(() => {
      const el = canvasElement.querySelector(
        '[data-slot="orbit-block-pair-orbit-face"][aria-label="Donyell Malen"]'
      );
      if (!el) throw new Error('no face');
      return el as HTMLElement;
    });
    await userEvent.click(face);
    const strip = await waitFor(() => {
      const el = canvasElement.querySelector('[data-slot="orbit-block-pair-detail"]');
      if (!el) throw new Error('no strip');
      return el;
    });
    await expect(strip.textContent).toContain('Donyell Malen, Aston Villa');
    const links = [...strip.querySelectorAll('a')].map((a) => [
      a.textContent,
      a.getAttribute('href'),
    ]);
    await expect(links).toContainEqual([
      'Player page',
      '/game/football/player/pex101/donyell-malen',
    ]);
    await expect(links).toContainEqual([
      'vs Mbappé',
      '/game/football/compare/p4b7614c5-vs-pex101/kylian-mbappe-vs-donyell-malen',
    ]);
    await expect(links).toContainEqual([
      'vs Haaland',
      '/game/football/compare/paf9e90f4-vs-pex101/erling-haaland-vs-donyell-malen',
    ]);
  },
};
