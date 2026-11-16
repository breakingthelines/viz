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
import { orbitContext, toOrbitData } from './similarity-orbit';

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

  it('draws one orbit with no text on it, its place in the label', () => {
    const html = render(SINGLE, 'tile');
    expect(html).toContain('data-slot="orbit-block-single"');
    expect(html).toContain('role="img"');
    expect(html).toContain('Donyell Malen');
    expect(html).not.toContain('orbit-block-verdict');
    expect(html).toContain('Strikers, top five leagues, 2026/27');
  });

  it('draws a pair with the verdict, the Both and Only rows and the family line', () => {
    const html = render(PAIR, 'tile');
    expect(html).toContain('data-slot="orbit-block-pair"');
    expect(html).toContain('>Different profiles<');
    expect(html).toContain('Only Mbappé:');
    expect(html).toContain('Only Haaland:');
    expect(html).toContain('Runner in behind');
    expect(html).toMatch(/Similar:<\/dt><dd[^>]*>Shooting</);
    expect(html).toMatch(/Different:<\/dt><dd[^>]*>Dribbling, Creating</);
    expect(html).not.toContain('Alike in');
    expect(html).not.toContain('Differ on');
    expect(html).toContain(
      'Erling Haaland is joint 85th closest of the 157 other strikers to Kylian Mbappé. Closest: Donyell Malen.'
    );
    expect(html).toContain('Mbappé v Haaland');
  });

  it('is interactive in an article and in chat, still in a picker tile', () => {
    expect(render(SINGLE, 'article')).toContain('role="group"');
    expect(render(PAIR, 'chat')).toContain('role="group"');
    expect(render(PAIR, 'tile')).not.toContain('role="group"');
  });

  it('reads its context from the pool and the season', () => {
    expect(orbitContext(config(SINGLE))).toBe('Strikers, top five leagues, 2026/27');
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
