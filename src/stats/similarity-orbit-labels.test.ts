import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  SimilarityOrbit,
  SimilarityOrbitCombined,
  SimilarityOrbitPair,
  type OrbitFaceLabels,
} from './similarity-orbit';
import { ORBIT_CARD, type OrbitData, type OrbitMember } from './similarity-orbit-model';

/** n strikers closest first, with scores falling from 90. */
function pool(prefix: string, n: number, named: Record<number, [string, string]> = {}) {
  return Array.from({ length: n }, (_, i): OrbitMember => {
    const [id, name] = named[i] ?? [`${prefix}${i}`, `Striker ${prefix}${i}`];
    return { id, name, rank: i + 1, similarity: 90 - i, imageUrl: `https://cdn.test/${id}.png` };
  });
}

const ANA: OrbitData = {
  anchor: { id: 'ana', name: 'Ana Primera', imageUrl: 'https://cdn.test/ana.png' },
  plural: 'strikers',
  poolLabel: 'Strikers',
  members: pool('a', 30, { 0: ['carl', 'Carl Closest'], 11: ['bo', 'Bo Segunda'] }),
};

const BO: OrbitData = {
  anchor: { id: 'bo', name: 'Bo Segunda', imageUrl: 'https://cdn.test/bo.png' },
  plural: 'strikers',
  poolLabel: 'Strikers',
  members: pool('b', 30, { 0: ['carl', 'Carl Closest'], 6: ['ana', 'Ana Primera'] }),
};

const named: OrbitFaceLabels = (m) => [m.name, `${m.similarity}% similar`];

describe('face labels on a still orbit', () => {
  it('names the nearest three beside their faces, with no buttons', () => {
    const html = renderToStaticMarkup(
      createElement(SimilarityOrbit, {
        orbit: ANA,
        interactive: false,
        scales: [{ scale: ORBIT_CARD }],
        faceLabels: named,
        slot: 'card',
      })
    );
    expect(html.match(/data-slot="card-orbit-face-label"/g)).toHaveLength(3);
    expect(html).toContain('Carl Closest');
    expect(html).toContain('90% similar');
    expect(html).toContain('Striker a2');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('role="button"');
    expect(html).not.toContain('tabindex');
    // A face is decoration on a still orbit.
    expect(html).toContain('data-slot="card-orbit-face"');
    // The card scale: 38 units of 340 for a near face.
    expect(html).toContain(`width:${((38 / 340) * 100).toFixed(3)}cqw`);
  });

  it('draws no labels on an interactive orbit or without the prop', () => {
    const live = renderToStaticMarkup(
      createElement(SimilarityOrbit, { orbit: ANA, faceLabels: named, slot: 'card' })
    );
    expect(live).not.toContain('face-label');
    const plain = renderToStaticMarkup(
      createElement(SimilarityOrbit, { orbit: ANA, interactive: false, slot: 'card' })
    );
    expect(plain).not.toContain('face-label');
  });

  it('leaves a face unnamed when the lines are empty', () => {
    const html = renderToStaticMarkup(
      createElement(SimilarityOrbit, {
        orbit: ANA,
        interactive: false,
        faceLabels: (m) => (m.id === 'carl' ? [m.name] : null),
        slot: 'card',
      })
    );
    expect(html.match(/data-slot="card-orbit-face-label"/g)).toHaveLength(1);
    expect(html).toContain('data-player="carl" data-side=');
  });

  it('labels the compared player on a still combined orbit, centred on the first', () => {
    const html = renderToStaticMarkup(
      createElement(SimilarityOrbitCombined, {
        orbits: [ANA, BO],
        shortNames: ['Primera', 'Segunda'],
        interactive: false,
        scales: [{ scale: ORBIT_CARD }],
        faceLabels: (m, o) => (m.id === 'bo' ? [m.name, `12th closest to Primera (${o})`] : null),
        slot: 'pair',
      })
    );
    expect(html).toContain('12th closest to Primera (0)');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('-switch');
  });

  it('passes each orbit of a still pair its own index', () => {
    const seen: string[] = [];
    const html = renderToStaticMarkup(
      createElement(SimilarityOrbitPair, {
        orbits: [ANA, BO],
        shortNames: ['Primera', 'Segunda'],
        interactive: false,
        faceLabels: (m, o) => {
          seen.push(`${o}:${m.id}`);
          return m.id === 'bo' || m.id === 'ana' ? [m.name] : null;
        },
        slot: 'pair',
      })
    );
    expect(seen).toContain('0:bo');
    expect(seen).toContain('1:ana');
    expect(html.match(/data-slot="pair-orbit-face-label"/g)).toHaveLength(2);
    expect(html).not.toContain('<button');
  });
});
