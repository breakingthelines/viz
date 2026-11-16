import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PLAYER_EXAMPLES, PLAYER_ORBIT_PAIR_EXAMPLE } from '../fixtures/player';
import { toGameBlockConfig } from '../to-config';
import type { GameBlockConfig, GameBlockDensity, GameBlockJson } from '../types';
import { GameBlockView } from '../view';
import {
  identitySlug,
  orbitSurname,
  playerComparePath,
  playerPagePath,
  playerRouteId,
} from './orbit-links';
import type { PlayerSimilarityOrbitDataJson } from './data';
import { acrossPools, areaRows, orbitVerdict, roleRows, toOrbitData } from './similarity-orbit';

function config(json: GameBlockJson): GameBlockConfig<PlayerSimilarityOrbitDataJson> {
  const res = toGameBlockConfig(json);
  if (!res.ok) throw new Error(`fixture did not map: ${res.reason}`);
  return res.config as GameBlockConfig<PlayerSimilarityOrbitDataJson>;
}

function render(json: GameBlockJson, density: GameBlockDensity = 'article') {
  return renderToStaticMarkup(
    h(GameBlockView, { config: config(json) as unknown as GameBlockConfig, density })
  );
}

const SINGLE = PLAYER_EXAMPLES['player-similarity-orbit'];
const PAIR = PLAYER_ORBIT_PAIR_EXAMPLE;

describe('similarity orbit block', () => {
  it('maps the block orbit onto the shared component data, closest first, ranks kept', () => {
    const d = toOrbitData(config(PAIR).data.orbits![0]!);
    expect(d.anchor).toMatchObject({ id: 'btl_football_player_p4b7614c5', name: 'Kylian Mbappé' });
    expect(d.plural).toBe('strikers');
    expect(d.members).toHaveLength(157);
    expect(d.members[0]).toMatchObject({ name: 'Donyell Malen', club: 'Aston Villa', rank: 1 });
    const haaland = d.members.findIndex((m) => m.name === 'Erling Haaland');
    expect(d.members[haaland]!.rank).toBe(85);
    expect(d.members[haaland + 1]!.rank).toBe(85);
  });

  it('draws one orbit with its three closest beside it, and no scope line', () => {
    const html = render(SINGLE, 'tile');
    expect(html).toContain('data-slot="orbit-block-single"');
    expect(html).toContain('role="img"');
    expect(html).toContain('Closest to Mbappé');
    expect(html).toMatch(/Donyell Malen<\/span><span[^>]*>Aston Villa</);
    expect(html).not.toContain('orbit-block-verdict');
    expect(html).not.toContain('Strikers, top five leagues');
  });

  it('draws a same-pool pair as one orbit, with the verdict, Roles and Areas', () => {
    const html = render(PAIR, 'tile');
    expect(html).toContain('data-slot="orbit-block-combined"');
    expect(html).not.toContain('data-slot="orbit-block-pair"');
    expect(html).toContain('>Different profiles<');
    expect(html).toContain('>Roles<');
    expect(html).toContain('>Areas<');
    expect(html).toMatch(/Both:<\/dt>/);
    expect(html).toMatch(/Mbappé:<\/dt><dd[^>]*>Inside forward, Runner in behind</);
    expect(html).toMatch(/Haaland:<\/dt><dd[^>]*>Target man</);
    expect(html).not.toContain('Only ');
    expect(html).toMatch(/Similar:<\/dt><dd[^>]*>Shooting</);
    expect(html).toMatch(/Different:<\/dt><dd[^>]*>Dribbling, Creating</);
    expect(html).not.toContain('Strikers, top five leagues');
    // Both directions in the accessible name, the first-named player's orbit drawn.
    expect(html).toContain(
      'Haaland is Mbappé&#x27;s 85th closest of the 157 other strikers. Mbappé is Haaland&#x27;s 60th closest.'
    );
    // Static: no switch, no strip.
    expect(html).not.toContain('orbit-block-combined-switch');
  });

  it('offers the swap switch only when interactive', () => {
    const html = render(PAIR, 'article');
    expect(html).toContain('data-slot="orbit-block-combined-switch"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>Mbappé</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Haaland</);
  });

  it('is interactive in an article and in chat, still in a picker tile', () => {
    expect(render(SINGLE, 'article')).toContain('role="group"');
    expect(render(PAIR, 'chat')).toContain('role="group"');
    expect(render(PAIR, 'tile')).not.toContain('role="group"');
  });

  it('says the verdict in its "profiles" form, stored blocks included', () => {
    expect(orbitVerdict('Similar')).toBe('Similar profiles');
    expect(orbitVerdict('Very similar')).toBe('Very similar profiles');
    expect(orbitVerdict('Very different')).toBe('Very different profiles');
    expect(orbitVerdict('Different profiles')).toBe('Different profiles');
    expect(orbitVerdict('Very similar profiles')).toBe('Very similar profiles');
    expect(orbitVerdict(undefined)).toBe('');
  });

  it('names Roles without "Only" and keeps Areas to the families it has', () => {
    const d = config(PAIR).data;
    expect(roleRows(d).map((r) => r.label)).toEqual(['Both', 'Mbappé', 'Haaland']);
    expect(areaRows({ alikeFamilies: ['Shooting'] })).toEqual([
      { label: 'Similar', values: ['Shooting'] },
    ]);
  });

  it('marks a pair across two pools: outsiders, captions and a scope without the position', () => {
    const cross = structuredClone(PAIR) as GameBlockJson & {
      playerSimilarityOrbit: PlayerSimilarityOrbitDataJson;
    };
    const [first, second] = cross.playerSimilarityOrbit.orbits!;
    second!.poolPhrase = 'attacking midfielders';
    first!.members!.find((m) => m.player?.name === 'Erling Haaland')!.outsidePool = true;
    const c = config(cross);
    expect(acrossPools((c.data.orbits ?? []).map(toOrbitData))).toBe(true);
    expect(acrossPools((config(PAIR).data.orbits ?? []).map(toOrbitData))).toBe(false);
    const a = toOrbitData(c.data.orbits![0]!);
    const b = toOrbitData(c.data.orbits![1]!);
    expect(a.poolLabel).toBe('Strikers');
    expect(b.poolLabel).toBe('Attacking midfielders');
    expect(a.members.filter((m) => m.outsidePool).map((m) => m.name)).toEqual(['Erling Haaland']);
    expect(b.members.some((m) => m.outsidePool)).toBe(false);
    const html = render(cross, 'tile');
    expect(html).toContain('data-slot="orbit-block-pair"');
    expect(html).toContain(
      'Erling Haaland, from outside this pool, would be 85th closest of the 156 other strikers to Kylian Mbappé.'
    );
  });
});

describe('orbit links', () => {
  it('slugs a name as identity does', () => {
    expect(identitySlug('Kylian Mbappé')).toBe('kylian-mbappe');
    expect(identitySlug("N'Golo Kanté")).toBe('ngolo-kante');
    expect(identitySlug('Hwang Hee-chan')).toBe('hwang-hee-chan');
  });

  it('takes route ids from canonical player ids only', () => {
    expect(playerRouteId('btl_football_player_p4b7614c5')).toBe('p4b7614c5');
    expect(playerRouteId('btl_football_team_t1')).toBeUndefined();
  });

  it("uses the block's page URL, else builds one from id and name", () => {
    expect(
      playerPagePath({
        id: 'btl_football_player_p1',
        name: 'X',
        url: '/game/football/player/p1/real-slug',
      })
    ).toBe('/game/football/player/p1/real-slug');
    expect(playerPagePath({ id: 'btl_football_player_p1', name: 'Donyell Malen' })).toBe(
      '/game/football/player/p1/donyell-malen'
    );
    expect(playerPagePath({ id: 'nope', name: 'Donyell Malen' })).toBeUndefined();
  });

  it('builds the comparison page in byte order, slugs from page URLs first', () => {
    const mbappe = {
      id: 'btl_football_player_p4b7614c5',
      name: 'Kylian Mbappé',
      url: '/game/football/player/p4b7614c5/kylian-mbappe',
    };
    const haaland = { id: 'btl_football_player_paf9e90f4', name: 'Erling Haaland' };
    const want = '/game/football/compare/p4b7614c5-vs-paf9e90f4/kylian-mbappe-vs-erling-haaland';
    expect(playerComparePath(haaland, mbappe)).toBe(want);
    expect(playerComparePath(mbappe, haaland)).toBe(want);
    expect(playerComparePath(mbappe, mbappe)).toBeUndefined();
  });

  it('shortens names as the Compare page does', () => {
    expect(orbitSurname('Kylian Mbappé')).toBe('Mbappé');
    expect(orbitSurname('Kevin De Bruyne')).toBe('De Bruyne');
    expect(orbitSurname('Haaland')).toBe('Haaland');
  });
});
