import { describe, expect, it } from 'vitest';

import {
  ORBIT_CARD,
  ORBIT_COMPACT,
  ORBIT_REGULAR,
  ORBIT_SINGLE,
  STEM_MIN,
  orbitCardLines,
  pairCardLines,
  placeCard,
  placeFaceLabel,
  placeWords,
  spotlightIds,
  spotlightLine,
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
  poolSize,
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
          // Long enough to read as a line (owner, 2026-11-17).
          expect(Math.hypot(x2 - x1, y2 - y1)).toBeGreaterThanOrEqual(
            STEM_MIN * (scale.size / ORBIT_REGULAR.size) - 1
          );
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

describe('a pair across two pools', () => {
  // Haaland's 157 fellow strikers, and Ødegaard, an attacking midfielder,
  // placed against him at 43rd (42 strikers score higher, three level).
  function haaland(): OrbitData {
    const members: OrbitData['members'] = [];
    for (let i = 0; i < 157; i++) {
      const rank = i < 42 ? i + 1 : i < 45 ? 43 : i + 1;
      members.push({ id: `s${i}`, name: `Striker ${i}`, rank });
    }
    members.splice(42, 0, { id: 'odegaard', name: 'Martin Ødegaard', rank: 43, outsidePool: true });
    members[0] = { ...members[0]!, name: 'Alexander Isak' };
    return {
      anchor: { id: 'haaland', name: 'Erling Haaland' },
      plural: 'strikers',
      poolLabel: 'Strikers',
      members,
    };
  }

  it("the pool leaves the outsider out of its size and everyone else's place", () => {
    const o = haaland();
    expect(o.members).toHaveLength(158);
    expect(poolSize(o)).toBe(157);
    // The striker after him is 43rd, not 44th.
    expect(rankPhrase(o, 43, 'Haaland')).toBe('43rd closest to Haaland');
    expect(rankPhrase(o, 0, 'Haaland')).toBe('Closest to Haaland');
  });

  it('the outsider reads where he would sit among the pool', () => {
    const o = haaland();
    expect(rankPhrase(o, 42, 'Haaland')).toBe('43rd closest to Haaland among strikers');
    expect(pairOrbitLabel(o, { id: 'odegaard', name: 'Martin Ødegaard' })).toBe(
      'Martin Ødegaard, from outside this pool, would be 43rd closest of the 157 other strikers to Erling Haaland. Closest: Alexander Isak.'
    );
    expect(singleOrbitLabel(o)).toContain('the 157 other strikers');
  });
});

describe('hover card and strip lines', () => {
  const scored = (data: OrbitData): OrbitData => ({
    ...data,
    members: data.members.map((m, i) => ({ ...m, similarity: 90 - i })),
  });

  it('gives the score, then the place in the pool', () => {
    const d = scored(orbit('h', 157));
    expect(orbitCardLines(d, 0, 'Haaland')).toEqual([
      '90% similar to Haaland',
      'Closest of 157 strikers',
    ]);
    expect(orbitCardLines(d, 15, 'Haaland')).toEqual([
      '75% similar to Haaland',
      '16th closest of 157 strikers',
    ]);
    expect(placeWords(d, 2)).toBe('3rd closest');
  });

  it('falls back to the place alone without a score', () => {
    const d = orbit('h', 20);
    expect(orbitCardLines(d, 4, 'Haaland')).toEqual(['5th closest to Haaland']);
  });

  it('gives a pair one line per orbit, the drawn orbit first', () => {
    const a = scored(rename(orbit('mb', 157), 5, 'ft', 'Ferran Torres'));
    const b = scored(rename(orbit('ha', 157), 18, 'ft', 'Ferran Torres'));
    expect(pairCardLines([a, b], ['Mbappé', 'Haaland'], 'ft', 0)).toEqual([
      '85% like Mbappé, 6th closest',
      '72% like Haaland, 19th closest',
    ]);
    expect(pairCardLines([a, b], ['Mbappé', 'Haaland'], 'ft', 1)).toEqual([
      '72% like Haaland, 19th closest',
      '85% like Mbappé, 6th closest',
    ]);
    // A centre player is in the other orbit only.
    const c = scored(rename(orbit('mb', 157), 84, 'ha', 'Erling Haaland'));
    expect(pairCardLines([c, b], ['Mbappé', 'Haaland'], 'ha', 0)).toEqual([
      '6% like Mbappé, 85th closest',
    ]);
  });
});

describe('roles spotlight', () => {
  it('lights the members who play any of its roles and counts the pool', () => {
    const d = orbit('h', 6);
    d.members[1]!.roles = ['Box Threat'];
    d.members[3]!.roles = ['Poacher', 'Box Threat'];
    d.members[4]!.roles = ['Dribbler'];
    d.members[5]!.outsidePool = true;
    d.members[5]!.roles = ['Box Threat'];
    const spot = { roles: ['Box Threat'], label: 'Box Threat' };
    expect([...spotlightIds(d, spot)].sort()).toEqual(['m1', 'm3', 'm5']);
    expect(spotlightLine(d, spot)).toBe('Box Threat: 2 of the 5 other strikers');
    expect(spotlightIds(d, null).size).toBe(0);
    expect(spotlightIds(d, { roles: [], label: '' }).size).toBe(0);
  });
});

describe('placeCard', () => {
  const base = { cx: 190, cy: 190, width: 200, height: 80, minX: -40, maxX: 420, minY: -500 };

  it('sits beside a face on the side with room', () => {
    const left = placeCard({ ...base, x: 120, y: 100, clear: 20, face: true });
    expect(left.side).toBe('right');
    expect(left.left).toBe(150);
    const right = placeCard({ ...base, x: 300, y: 100, clear: 20, face: true });
    expect(right.side).toBe('left');
    expect(right.left).toBe(70);
  });

  it('drops under or over a dot, away from the centre, when no side fits', () => {
    const narrow = { ...base, minX: 0, maxX: 260 };
    const low = placeCard({ ...narrow, x: 130, y: 260, clear: 4, face: true });
    expect(low.side).toBe('below');
    expect(low.top).toBe(274);
    const high = placeCard({ ...narrow, x: 130, y: 120, clear: 4, face: false });
    expect(high.side).toBe('above');
    expect(high.top).toBe(120 - 4 - 10 - 80);
  });

  it('stays inside the viewport edges and flips under when the top is off screen', () => {
    const edge = placeCard({ ...base, x: 10, y: 120, clear: 4, face: false, minX: 4, minY: 40 });
    expect(edge.left).toBe(4);
    expect(edge.side).toBe('below');
    const far = placeCard({ ...base, x: 410, y: 300, clear: 4, face: false, maxX: 400 });
    expect(far.left + base.width).toBeLessThanOrEqual(400);
  });
});

describe('placeFaceLabel', () => {
  // A 448 px field centred at 224, labels 120 x 30, 14 px of reach each side.
  const base = {
    cx: 224,
    cy: 224,
    width: 120,
    height: 30,
    clear: 30,
    minX: -14,
    maxX: 462,
    minY: 0,
    maxY: 448,
  };

  it('names a face on the side away from the centre', () => {
    const right = placeFaceLabel({ ...base, x: 300, y: 260 });
    expect(right).toEqual({ side: 'right', left: 330, top: 245 });
    const left = placeFaceLabel({ ...base, x: 150, y: 200 });
    expect(left).toEqual({ side: 'left', left: 150 - 30 - 120, top: 185 });
    const above = placeFaceLabel({ ...base, x: 224, y: 120 });
    expect(above).toEqual({ side: 'above', left: 164, top: 60 });
    const below = placeFaceLabel({ ...base, x: 230, y: 330 });
    expect(below.side).toBe('below');
    expect(below.top).toBe(360);
  });

  it('goes above or below when the side away from the centre runs out of room', () => {
    // Left of a face near the left edge would leave the card's padding.
    const low = placeFaceLabel({ ...base, x: 60, y: 260 });
    expect(low.side).toBe('below');
    expect(low.left).toBe(0);
    const high = placeFaceLabel({ ...base, x: 400, y: 180 });
    expect(high.side).toBe('above');
  });

  it('takes a side for a face at the top edge, then below when no side fits', () => {
    const top = placeFaceLabel({ ...base, x: 224, y: 20 });
    expect(top.side).toBe('right');
    const narrow = placeFaceLabel({ ...base, x: 120, y: 20, minX: -6, maxX: 246 });
    expect(narrow.side).toBe('below');
    expect(narrow.top).toBe(50);
  });

  it('never towards the centre while another side fits, and stays inside when none does', () => {
    const towards = placeFaceLabel({ ...base, x: 60, y: 20, maxY: 60 });
    expect(towards.side).toBe('right');
    const cramped = placeFaceLabel({ ...base, x: 60, y: 224, minX: 0, maxX: 100, maxY: 240 });
    expect(cramped.side).toBe('left');
    expect(cramped.left).toBe(0);
    expect(cramped.top + base.height).toBeLessThanOrEqual(240);
  });

  it('never covers another face while a side is free', () => {
    // Below the face would cover the centre; the next side is taken.
    const near = placeFaceLabel({ ...base, x: 224, y: 300, avoid: [{ x: 224, y: 224, r: 40 }] });
    expect(near.side).toBe('below');
    const blocked = placeFaceLabel({ ...base, x: 224, y: 120, avoid: [{ x: 224, y: 70, r: 20 }] });
    expect(blocked.side).toBe('right');
  });

  it('has a card scale with faces bigger than the single orbit', () => {
    expect(ORBIT_CARD.size).toBe(ORBIT_SINGLE.size);
    expect(ORBIT_CARD.head).toBeGreaterThan(ORBIT_SINGLE.head);
    expect(ORBIT_CARD).toEqual({ size: 340, face: 68, head: 38, dot: 2.9 });
  });
});
