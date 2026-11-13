import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BlockFrame, type BlockMedia } from './frame';
import { pickPosterArt } from './halftone';

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

describe('poster fallback', () => {
  it('prefers the halftone cut-out of the headshot', () => {
    expect(
      pickPosterArt({ status: 'ready', url: 'data:cut' }, { src: 'crest.png', status: 'ok' })
    ).toEqual({ status: 'ready', kind: 'halftone', src: 'data:cut' });
  });

  it('waits while the cut-out is computing', () => {
    expect(
      pickPosterArt({ status: 'working', url: null }, { src: 'crest.png', status: 'ok' })
    ).toEqual({ status: 'working' });
  });

  it('leads with the crest when the headshot is missing or unusable', () => {
    expect(
      pickPosterArt({ status: 'none', url: null }, { src: 'crest.png', status: 'ok' })
    ).toEqual({ status: 'ready', kind: 'crest', src: 'crest.png' });
    expect(
      pickPosterArt({ status: 'none', url: null }, { src: 'crest.png', status: 'working' })
    ).toEqual({ status: 'working' });
  });

  it('gives up when there is no crest or it does not load', () => {
    expect(
      pickPosterArt({ status: 'none', url: null }, { src: undefined, status: 'none' })
    ).toEqual({ status: 'none' });
    expect(
      pickPosterArt({ status: 'none', url: null }, { src: 'broken.png', status: 'none' })
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
