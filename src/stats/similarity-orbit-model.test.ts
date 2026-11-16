import { describe, expect, it } from 'vitest';

import {
  ORBIT_COMPACT,
  ORBIT_REGULAR,
  ORBIT_SINGLE,
  driftFor,
  driftKeyframes,
  isJoint,
  linkedDot,
  memberIndex,
  nearestDot,
  orbitDots,
  orbitLayout,
  pairOrbitLabel,
  placesLine,
  rankPhrase,
  singleOrbitLabel,
  type OrbitData,
} from './similarity-orbit-model';

/** n members closest first; each run in `tied` shares the first one's rank. */
function orbit(anchor: string, n: number, plural = 'strikers', tied: number[][] = []): OrbitData {
  const members = Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    name: `Player m${i}`,
    club: 'Club FC',
    rank: i + 1,
  }));
  for (const run of tied) for (const i of run) members[i]!.rank = members[run[0]!]!.rank;
  return { anchor: { id: anchor, name: `Anchor ${anchor}` }, plural, members };
}

function rename(data: OrbitData, index: number, id: string, name: string): OrbitData {
  const members = data.members.map((m) => ({ ...m }));
  members[index] = { ...members[index]!, id, name };
  return { ...data, members };
}

function minGap(dots: { x: number; y: number }[]): number {
  let min = Infinity;
  for (let i = 0; i < dots.length; i++)
    for (let j = i + 1; j < dots.length; j++)
      min = Math.min(min, Math.hypot(dots[i]!.x - dots[j]!.x, dots[i]!.y - dots[j]!.y));
  return min;
}

describe('orbit geometry', () => {
  const cases = [
    { scale: ORBIT_REGULAR, n: 157 },
    { scale: ORBIT_COMPACT, n: 157 },
    { scale: ORBIT_COMPACT, n: 186 },
    { scale: ORBIT_SINGLE, n: 157 },
  ];

  it('rank is the radius, inside the field, and no two dots overlap', () => {
    for (const { scale, n } of cases) {
      const dots = orbitDots(n, scale, 84);
      for (let i = 1; i < n; i++) expect(dots[i]!.r).toBeGreaterThan(dots[i - 1]!.r);
      expect(dots[n - 1]!.r).toBeLessThanOrEqual(scale.size / 2);
      expect(dots[0]!.r).toBeGreaterThan(scale.face / 2 + scale.dot);
      expect(minGap(dots)).toBeGreaterThan(scale.dot * 2);
    }
  });

  it('turns the spiral so the given member points straight up', () => {
    for (const up of [0, 3, 84, 156]) {
      const d = orbitDots(157, ORBIT_REGULAR, up)[up]!;
      expect(d.x).toBeCloseTo(ORBIT_REGULAR.size / 2, 6);
      expect(d.y).toBeLessThan(ORBIT_REGULAR.size / 2);
    }
  });

  it('every face sits on a stem from its own dot, clear of the centre and each other', () => {
    for (const { scale, n } of cases) {
      for (const up of [0, 1, 2, 3, 5, 84, n - 1]) {
        const wanted = [up, 0, 1, 2, 40]
          .filter((v, i, a) => a.indexOf(v) === i)
          .map((index, k) => ({
            index,
            size: k === 0 || index === 40 ? scale.head + 4 : scale.head,
          }));
        const layout = orbitLayout(n, scale, up, wanted);
        expect(layout.faces.map((f) => f.index)).toEqual(wanted.map((w) => w.index));
        const c = scale.size / 2;
        for (const f of layout.faces) {
          const dot = layout.dots[f.index]!;
          const [x1, y1, x2, y2] = f.stem;
          // The stem starts at its own dot, ends at the face's edge, and runs
          // from the dot through the face's centre.
          expect(Math.hypot(x1 - dot.x, y1 - dot.y)).toBeLessThanOrEqual(scale.dot + 1);
          expect(Math.hypot(x2 - f.x, y2 - f.y)).toBeCloseTo(f.size / 2, 3);
          const cross = (x2 - x1) * (f.y - dot.y) - (y2 - y1) * (f.x - dot.x);
          expect(Math.abs(cross)).toBeLessThan(1e-6);
          expect(Math.hypot(f.x - c, f.y - c)).toBeGreaterThanOrEqual(scale.face / 2 + f.size / 2);
          for (const g of layout.faces) {
            if (g === f) continue;
            expect(Math.hypot(f.x - g.x, f.y - g.y)).toBeGreaterThanOrEqual(
              f.size / 2 + g.size / 2
            );
          }
        }
      }
    }
  });

  it('reports how far faces reach past the square', () => {
    const outer = orbitLayout(157, ORBIT_REGULAR, 156, [{ index: 156, size: 34 }]);
    expect(outer.overflow.top).toBeGreaterThan(0);
    const inner = orbitLayout(157, ORBIT_REGULAR, 0, [{ index: 0, size: 30 }]);
    expect(inner.overflow).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('finds the nearest dot within reach', () => {
    const dots = orbitDots(157, ORBIT_REGULAR, 0);
    expect(nearestDot(dots, dots[12]!.x + 1, dots[12]!.y, 6)).toBe(12);
    expect(nearestDot(dots, 0, 0, 6)).toBe(-1);
  });

  it('drift is seeded by the player and stays well inside the dot spacing', () => {
    const a = driftFor('p4b7614c5', 157, ORBIT_REGULAR);
    expect(driftFor('p4b7614c5', 157, ORBIT_REGULAR)).toEqual(a);
    expect(driftFor('paf9e90f4', 157, ORBIT_REGULAR)).not.toEqual(a);
    for (const { scale, n } of cases) {
      const gap = minGap(orbitDots(n, scale, 0));
      for (const id of ['a', 'b', 'c', 'p4b7614c5', 'paf9e90f4']) {
        const d = driftFor(id, n, scale);
        // Two neighbours drifting towards each other still never touch.
        expect(2 * Math.max(Math.abs(d.rx), Math.abs(d.ry)) + 2 * scale.dot).toBeLessThan(gap);
        expect(d.period).toBeGreaterThanOrEqual(9);
        expect(d.phase).toBeLessThanOrEqual(d.period);
      }
    }
    const frames = driftKeyframes(a, (v) => `${v}px`);
    expect(frames[0]!.transform).toBe(frames[4]!.transform);
    expect(frames.map((f) => f.offset)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});

describe('orbit ranks and labels', () => {
  // Mbappé's orbit: Haaland level with five others at 85th.
  const mbappe = rename(
    rename(
      orbit('mbappe', 157, 'strikers', [[84, 85, 86, 87, 88, 89]]),
      84,
      'haaland',
      'Erling Haaland'
    ),
    0,
    'malen',
    'Donyell Malen'
  );
  const haaland = { id: 'haaland', name: 'Erling Haaland' };

  it('equal ranks are joint for screen readers; the strip reads the plain position', () => {
    const i = memberIndex(mbappe, 'haaland');
    expect(mbappe.members[i]!.rank).toBe(85);
    expect(isJoint(mbappe, i)).toBe(true);
    expect(isJoint(mbappe, 0)).toBe(false);
    expect(rankPhrase(mbappe, i, 'Mbappé')).toBe('85th closest to Mbappé');
    expect(rankPhrase(mbappe, i + 1, 'Mbappé')).toBe('86th closest to Mbappé');
    expect(rankPhrase(mbappe, 0, 'Mbappé')).toBe('Closest to Mbappé');
    expect(rankPhrase(mbappe, 11, 'Mbappé')).toBe('12th closest to Mbappé');
    const tiedTop = orbit('x', 5, 'strikers', [[0, 1]]);
    expect(rankPhrase(tiedTop, 0, 'X')).toBe('Closest to X');
    expect(rankPhrase(tiedTop, 1, 'X')).toBe('2nd closest to X');
  });

  it('names each orbit for screen readers', () => {
    const named = { ...mbappe, anchor: { id: 'mbappe', name: 'Kylian Mbappé' } };
    expect(pairOrbitLabel(named, haaland)).toBe(
      'Erling Haaland is joint 85th closest of the 157 other strikers to Kylian Mbappé. Closest: Donyell Malen.'
    );
    const tel = rename(orbit('madueke', 186, 'wingers'), 0, 'tel', 'Mathys Tel');
    expect(
      pairOrbitLabel(
        { ...tel, anchor: { id: 'madueke', name: 'Noni Madueke' } },
        { id: 'tel', name: 'Mathys Tel' }
      )
    ).toBe('Mathys Tel is the closest of the 186 other wingers to Noni Madueke.');
    expect(singleOrbitLabel(named)).toBe(
      'Kylian Mbappé at the centre, the 157 other strikers in the top five leagues around him, nearer means more alike. Closest: Donyell Malen, Player m1, Player m2.'
    );
  });

  it('a selected player reads his place in each orbit; a centre player the other only', () => {
    const second = rename(orbit('haaland', 157), 48, 'malen', 'Donyell Malen');
    const withMbappe = rename(second, 66, 'mbappe', 'Kylian Mbappé');
    const both = [mbappe, withMbappe];
    expect(placesLine(both, ['Mbappé', 'Haaland'], 'malen')).toBe(
      'Closest to Mbappé · 49th closest to Haaland'
    );
    expect(placesLine(both, ['Mbappé', 'Haaland'], 'haaland')).toBe('85th closest to Mbappé');
  });

  it('a pick of one centre rings the other centre in the other orbit', () => {
    const second = rename(orbit('haaland', 157), 66, 'mbappe', 'Kylian Mbappé');
    const both = [mbappe, second];
    expect(linkedDot('haaland', 0, both, 1)).toBe('mbappe');
    expect(linkedDot('haaland', 0, both, 0)).toBe('haaland');
    expect(linkedDot('m3', 0, both, 1)).toBe('m3');
    expect(linkedDot(null, 0, both, 1)).toBeNull();
  });
});
