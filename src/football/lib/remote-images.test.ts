import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Crest } from './crest';
import { PasserAvatar } from './passer-avatar';

// A live `<img crossorigin>` shares the browser HTTP cache with plain loads of
// the same CDN URL, and a plain cached copy carries no
// Access-Control-Allow-Origin, so the CORS load is blocked. Export re-fetches
// every image itself, so no live element needs the attribute. See crest.tsx.

const CREST_URL = 'https://cdn.breakingthelines.app/media/football/team/crest.png';
const HEADSHOT_URL = 'https://cdn.breakingthelines.app/media/football/player/headshot.png';

/** The first `<img …>` tag in server-rendered markup. */
function imgTag(html: string): string {
  const tag = html.match(/<img\b[^>]*>/)?.[0];
  if (!tag) throw new Error(`no <img> in ${html}`);
  return tag;
}

describe('live remote images load plainly', () => {
  it('Crest renders an <img> with no crossorigin attribute', () => {
    const img = imgTag(
      renderToStaticMarkup(createElement(Crest, { url: CREST_URL, name: 'Arsenal' }))
    );
    expect(img).toContain(`src="${CREST_URL}"`);
    expect(img).not.toMatch(/crossorigin/i);
  });

  it('PasserAvatar renders an <img> with no crossorigin attribute', () => {
    const img = imgTag(
      renderToStaticMarkup(
        createElement(PasserAvatar, {
          name: 'Bukayo Saka',
          imageUrl: HEADSHOT_URL,
          color: '#eb0000',
        })
      )
    );
    expect(img).toContain(`src="${HEADSHOT_URL}"`);
    expect(img).not.toMatch(/crossorigin/i);
  });
});
