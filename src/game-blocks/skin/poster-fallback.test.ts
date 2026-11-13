import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BlockFrame, type BlockMedia } from './frame';
import { canvasScale, pickPosterArt } from './halftone';
import { playerHalftoneUrl, playerHeadshotUrl, resolveMediaSrc } from './assets';

function poster(media?: BlockMedia) {
  return renderToStaticMarkup(
    h(BlockFrame, {
      look: 'poster',
      context: 'Real Madrid, 2026/27',
      title: 'Example Player',
      density: 'article',
      exportName: 'example',
      media,
      hero: { figure: '17', label: 'goals' },
    })
  );
}

const NO_PRE = { src: undefined, status: 'none' } as const;

describe('poster fallback', () => {
  it('prefers the pre-rendered halftone from the CDN', () => {
    expect(
      pickPosterArt(
        { src: 'https://cdn/x', status: 'ok' },
        { status: 'ready', url: 'data:cut' },
        { src: 'crest.png', status: 'ok' }
      )
    ).toEqual({ status: 'ready', kind: 'halftone', src: 'https://cdn/x' });
    expect(
      pickPosterArt(
        { src: 'https://cdn/x', status: 'working' },
        { status: 'ready', url: 'data:cut' },
        { src: 'crest.png', status: 'ok' }
      )
    ).toEqual({ status: 'working' });
  });

  it('computes its own halftone when the CDN has none', () => {
    expect(
      pickPosterArt(
        { src: 'https://cdn/x', status: 'none' },
        { status: 'ready', url: 'data:cut' },
        { src: 'crest.png', status: 'ok' }
      )
    ).toEqual({ status: 'ready', kind: 'halftone', src: 'data:cut' });
  });

  it('prefers the halftone cut-out of the headshot', () => {
    expect(
      pickPosterArt(
        NO_PRE,
        { status: 'ready', url: 'data:cut' },
        { src: 'crest.png', status: 'ok' }
      )
    ).toEqual({ status: 'ready', kind: 'halftone', src: 'data:cut' });
  });

  it('waits while the cut-out is computing', () => {
    expect(
      pickPosterArt(NO_PRE, { status: 'working', url: null }, { src: 'crest.png', status: 'ok' })
    ).toEqual({ status: 'working' });
  });

  it('leads with the crest when the headshot is missing or unusable', () => {
    expect(
      pickPosterArt(NO_PRE, { status: 'none', url: null }, { src: 'crest.png', status: 'ok' })
    ).toEqual({ status: 'ready', kind: 'crest', src: 'crest.png' });
    expect(
      pickPosterArt(NO_PRE, { status: 'none', url: null }, { src: 'crest.png', status: 'working' })
    ).toEqual({ status: 'working' });
  });

  it('gives up when there is no crest or it does not load', () => {
    expect(
      pickPosterArt(NO_PRE, { status: 'none', url: null }, { src: undefined, status: 'none' })
    ).toEqual({ status: 'none' });
    expect(
      pickPosterArt(NO_PRE, { status: 'none', url: null }, { src: 'broken.png', status: 'none' })
    ).toEqual({ status: 'none' });
  });

  it('draws the editorial look, not an empty poster, with no image at all', () => {
    const html = poster();
    expect(html).toContain('data-game-block-look="editorial"');
    expect(html).toContain('data-game-block-look-fallback="poster"');
    expect(html).not.toContain('<polygon');
    expect(html).toContain('17');
    expect(poster({ kind: 'person' })).toContain('data-game-block-look="editorial"');
  });

  it('stays a poster while a headshot or crest may still be drawn', () => {
    for (const media of [
      { kind: 'person', src: 'head.png' },
      { kind: 'person', crestSrc: 'crest.png' },
      { kind: 'crest', src: 'crest.png' },
    ] as BlockMedia[]) {
      const html = poster(media);
      expect(html).toContain('data-game-block-look="poster"');
      expect(html).not.toContain('data-game-block-look-fallback');
    }
  });
});

describe('poster images by convention', () => {
  const base = 'https://cdn.breakingthelines.app/media';
  it('builds a player halftone and headshot address from the id', () => {
    expect(playerHalftoneUrl(base, 'btl_football_player_p4b7614c5')).toBe(
      'https://cdn.breakingthelines.app/media/resolved/player-halftone/btl_football_player_p4b7614c5'
    );
    expect(playerHeadshotUrl(`${base}/`, 'btl_football_player_p4b7614c5')).toBe(
      'https://cdn.breakingthelines.app/media/apifootball/player/btl_football_player_p4b7614c5.png'
    );
  });

  it('puts a relative CDN key on the media base, never the page origin', () => {
    expect(resolveMediaSrc('media/resolved/crest/t1', base)).toBe(`${base}/resolved/crest/t1`);
    expect(resolveMediaSrc('/media/resolved/crest/t1', base)).toBe(`${base}/resolved/crest/t1`);
    expect(resolveMediaSrc('https://x.test/a.png', base)).toBe('https://x.test/a.png');
    expect(resolveMediaSrc('data:image/png;base64,AA', base)).toBe('data:image/png;base64,AA');
    expect(resolveMediaSrc('', base)).toBeUndefined();
  });

  it('draws the in-browser halftone at device pixels', () => {
    // A 150 px headshot drawn 306 CSS px tall at 3x is 918 device px.
    expect(canvasScale(150, 4, 918)).toBe(7);
    expect(canvasScale(150, 4, 300)).toBe(4);
    expect(canvasScale(1500, 4, 918)).toBe(1);
  });

  it('stays a poster for a player with only an id', () => {
    const html = poster({ kind: 'person', personId: 'btl_football_player_p4b7614c5' });
    expect(html).toContain('data-game-block-look="poster"');
  });
});
