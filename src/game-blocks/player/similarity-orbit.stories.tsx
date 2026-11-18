import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';
import { syntheticHeadshot } from '../fixtures/media';
import { PLAYER_EXAMPLES, PLAYER_ORBIT_PAIR_EXAMPLE } from '../fixtures/player';
import { toGameBlockConfig } from '../to-config';
import type { GameBlockConfig, GameBlockDensity, GameBlockJson, GameBlockLook } from '../types';
import { GameBlockView } from '../view';
import type { GameBlockOrbitJson, PlayerSimilarityOrbitDataJson } from './data';
import { Page } from './story-kit';

/**
 * Player › Orbit, one player and a pair, in an article, in chat and
 * as a still picker tile. EXAMPLE FIGURES ONLY: the ranks are made up, and
 * the faces are drawn busts, not people.
 */

interface OrbitArgs {
  pair: boolean;
  /** The pair across two pools: Haaland outside Mbappé's, captions shown. */
  acrossPools?: boolean;
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

/** The pair fixture with the second orbit's pool another position group. */
function acrossPools(json: GameBlockJson): GameBlockJson {
  const out = structuredClone(json) as GameBlockJson & {
    playerSimilarityOrbit: PlayerSimilarityOrbitDataJson;
  };
  const [first, second] = out.playerSimilarityOrbit.orbits ?? [];
  if (second) second.poolPhrase = 'attacking midfielders';
  const outsider = first?.members?.find((m) => m.player?.name === 'Erling Haaland');
  if (outsider) outsider.outsidePool = true;
  return out;
}

function OrbitExample({ pair, acrossPools: across, look, width, density }: OrbitArgs) {
  const c = exampleConfig(
    pair
      ? across
        ? acrossPools(PLAYER_ORBIT_PAIR_EXAMPLE)
        : PLAYER_ORBIT_PAIR_EXAMPLE
      : PLAYER_EXAMPLES['player-similarity-orbit']
  );
  return (
    <Page width={width}>
      <GameBlockView config={{ ...c, look } as unknown as GameBlockConfig} density={density} />
    </Page>
  );
}

const meta = {
  title: 'Game blocks/Player/Orbit',
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
  await expect(text).toContain('Mbappé:Inside forward');
  await expect(text).not.toContain('Only ');
  await expect(text).toContain('Similar:Shooting');
  await expect(text).toContain('Different:Dribbling, Creating');
  await expect(text).not.toContain('top five leagues, 2026/27');
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
export const PairAcrossPools680: Story = {
  args: { pair: true, acrossPools: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="orbit-block-pair"]')).not.toBeNull();
    await expect(canvasElement.textContent).toContain('Attacking midfielders');
  },
};
export const PairAcrossPools390: Story = { args: { pair: true, acrossPools: true, width: 390 } };
export const PairTile: Story = {
  args: { pair: true, density: 'tile', width: 320 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[role="group"]')).toBeNull();
    const labels = [...canvasElement.querySelectorAll('[role="img"]')].map((e) =>
      e.getAttribute('aria-label')
    );
    await expect(labels).toEqual([
      "Haaland is Mbappé's 85th closest of the 157 other strikers. Mbappé is Haaland's 60th closest.",
    ]);
    await expect(
      canvasElement.querySelector('[data-slot="orbit-block-combined-switch"]')
    ).toBeNull();
  },
};

/** A tap on a face opens the strip: name, club, places, his page and Compare with. */
export const VerifyTapOpensStrip: Story = {
  args: { pair: true },
  play: async ({ canvasElement }) => {
    const face = await waitFor(() => {
      const el = canvasElement.querySelector(
        '[data-slot="orbit-block-combined-orbit-face"][aria-label="Donyell Malen"]'
      );
      if (!el) throw new Error('no face');
      return el as HTMLElement;
    });
    await userEvent.click(face);
    const strip = await waitFor(() => {
      const el = canvasElement.querySelector('[data-slot="orbit-block-combined-detail"]');
      if (!el) throw new Error('no strip');
      return el;
    });
    await expect(strip).toHaveAttribute('role', 'region');
    await expect(strip).toHaveAttribute('aria-label', 'Donyell Malen, Aston Villa');
    const places = [
      ...strip.querySelectorAll('[data-slot="orbit-block-combined-detail-places"] span'),
    ].map((e) => e.textContent);
    await expect(places).toEqual(['Closest to Mbappé', '8th closest to Haaland']);
    const page = strip.querySelector('a');
    await expect(page?.textContent).toBe('Player page');
    await expect(page).toHaveAttribute('href', '/game/football/player/pex101/donyell-malen');
    const select = strip.querySelector('select') as HTMLSelectElement;
    await expect(select).toHaveAccessibleName('Compare with');
    await expect([...select.options].map((o) => o.textContent)).toEqual(['Mbappé', 'Haaland']);
    const show = [...strip.querySelectorAll('a')].find((a) => a.textContent === 'Show')!;
    await expect(show).toHaveAttribute(
      'href',
      '/game/football/compare/p4b7614c5-vs-pex101/kylian-mbappe-vs-donyell-malen'
    );
    await userEvent.selectOptions(select, '1');
    await expect(show).toHaveAttribute(
      'href',
      '/game/football/compare/paf9e90f4-vs-pex101/erling-haaland-vs-donyell-malen'
    );
  },
};

/** Tapping the second player's face, or the switch, re-centres the orbit on him and back. */
export const VerifySwap: Story = {
  args: { pair: true },
  play: async ({ canvasElement }) => {
    const root = () =>
      canvasElement.querySelector('[data-slot="orbit-block-combined"]') as HTMLElement;
    await expect(root()).toHaveAttribute('data-orbit-centre', 'btl_football_player_p4b7614c5');
    const face = canvasElement.querySelector(
      '[data-slot="orbit-block-combined-orbit-face"][aria-label="Erling Haaland"]'
    ) as HTMLElement;
    await userEvent.click(face);
    await waitFor(() =>
      expect(root()).toHaveAttribute('data-orbit-centre', 'btl_football_player_paf9e90f4')
    );
    const options = [
      ...canvasElement.querySelectorAll('[data-slot="orbit-block-combined-switch-option"]'),
    ];
    await expect(options[1]).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(options[0] as HTMLElement);
    await waitFor(() =>
      expect(root()).toHaveAttribute('data-orbit-centre', 'btl_football_player_p4b7614c5')
    );
  },
};

/** After a swap, Compare with starts on the player now at the centre. */
export const VerifyCompareStartsOnCentre: Story = {
  args: { pair: true },
  play: async ({ canvasElement }) => {
    const options = [
      ...canvasElement.querySelectorAll('[data-slot="orbit-block-combined-switch-option"]'),
    ];
    await userEvent.click(options[1] as HTMLElement);
    const face = await waitFor(() => {
      const el = canvasElement.querySelector(
        '[data-slot="orbit-block-combined-orbit-face"][aria-label="Lois Openda"]'
      );
      if (!el) throw new Error('no face');
      return el as HTMLElement;
    });
    await userEvent.click(face);
    const strip = await waitFor(() => {
      const el = canvasElement.querySelector('[data-slot="orbit-block-combined-detail"]');
      if (!el) throw new Error('no strip');
      return el;
    });
    const select = strip.querySelector('select') as HTMLSelectElement;
    await expect(select.options[select.selectedIndex]?.textContent).toBe('Haaland');
  },
};

/** The single orbit's strip: one place and a plain Compare with link. */
export const VerifySingleStrip: Story = {
  play: async ({ canvasElement }) => {
    const face = await waitFor(() => {
      const el = canvasElement.querySelector(
        '[data-slot="orbit-block-single-orbit-face"][aria-label="Donyell Malen"]'
      );
      if (!el) throw new Error('no face');
      return el as HTMLElement;
    });
    await userEvent.click(face);
    const strip = await waitFor(() => {
      const el = canvasElement.querySelector('[data-slot="orbit-block-single-detail"]');
      if (!el) throw new Error('no strip');
      return el;
    });
    const links = [...strip.querySelectorAll('a')].map((a) => a.textContent);
    await expect(links).toEqual(['Player page', 'Compare with Mbappé']);
    await expect(strip.querySelector('select')).toBeNull();
  },
};

/**
 * The orbit, mounted from a timer after a click, as a Regista answer mounts
 * it from a stream event. A click is a discrete update, after which React
 * runs even passive effects before paint, so mounting in the click itself
 * would hide the bug this guards.
 */
function OrbitMountedLater(args: OrbitArgs) {
  const [on, setOn] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setTimeout(() => setOn(true), 0)}>
        Mount orbit
      </button>
      {on ? <OrbitExample {...args} /> : null}
    </div>
  );
}

/**
 * The orbit never paints finished before its arrival (owner, prod, 18 Nov
 * 2026: a Regista orbit showed every face in place for one frame, then went
 * empty and animated in). A MutationObserver callback runs as a microtask
 * after React commits the orbit, before any passive effect and before the
 * browser paints: the faces must already be at the arrival's start (hidden,
 * their animation attached). Deciding motion in a passive effect fails this
 * every time: at that point the faces are finished and no animation exists.
 */
export const VerifyNoFinishedFrameOnMount: Story = {
  args: { density: 'chat', width: 420 },
  render: (args) => <OrbitMountedLater {...args} />,
  play: async ({ canvasElement }) => {
    let seen: { faces: number; hidden: number; animated: number } | null = null;
    const mo = new MutationObserver(() => {
      if (seen) return;
      const faces = [...canvasElement.querySelectorAll<HTMLElement>('[data-orbit-glide-face]')];
      if (!faces.length) return;
      seen = {
        faces: faces.length,
        hidden: faces.filter((f) => parseFloat(getComputedStyle(f).opacity) < 0.05).length,
        animated: faces.filter((f) => f.getAnimations().length > 0).length,
      };
    });
    mo.observe(canvasElement, { childList: true, subtree: true });
    await userEvent.click(canvasElement.querySelector('button')!);
    await waitFor(() => expect(seen).not.toBeNull());
    mo.disconnect();
    const s = seen!;
    await expect(s.animated).toBe(s.faces);
    await expect(s.hidden).toBe(s.faces);
  },
};
