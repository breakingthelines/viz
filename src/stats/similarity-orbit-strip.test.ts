import { createElement, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { OrbitDetailStrip } from './similarity-orbit';

const base = {
  open: true,
  sources: ['https://cdn.test/a.png'],
  title: 'Anastasios Douvikas, Como',
  line: '',
  name: 'Anastasios Douvikas',
  club: 'Como',
  lines: ['82% similar to Haaland'],
  onClose: () => {},
  focusRef: createRef<HTMLDivElement>(),
  slot: 'orbit-detail',
  animate: false,
};

describe('the detail strip', () => {
  it("links the selected player's name to his page", () => {
    const html = renderToStaticMarkup(
      createElement(OrbitDetailStrip, {
        ...base,
        href: '/game/football/player/p1/anastasios-douvikas',
      })
    );
    expect(html).toContain('href="/game/football/player/p1/anastasios-douvikas"');
    expect(html).toMatch(/<a [^>]*data-slot="orbit-detail-name"[^>]*>Anastasios Douvikas<\/a>/);
  });

  it('shows the name as text when there is no page', () => {
    const html = renderToStaticMarkup(createElement(OrbitDetailStrip, base));
    expect(html).not.toContain('orbit-detail-name');
    expect(html).toContain('Anastasios Douvikas');
  });
});
