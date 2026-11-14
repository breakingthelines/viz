import { describe, expect, it } from 'vitest';
import { nudgeStyleMap, styleMapAxis, styleMapStep } from './style-map';

describe('styleMapStep', () => {
  it('picks a round step for about five ticks', () => {
    expect(styleMapStep(40)).toBe(10);
    expect(styleMapStep(9)).toBe(2);
    expect(styleMapStep(12)).toBe(2.5);
  });

  it('falls back to 1 for an empty span', () => {
    expect(styleMapStep(0)).toBe(1);
    expect(styleMapStep(Number.NaN)).toBe(1);
  });
});

describe('styleMapAxis', () => {
  it('pads and snaps the domain outward to the step', () => {
    const a = styleMapAxis([33.1, 65.5, 49.9]);
    expect(a.min).toBe(30);
    expect(a.max).toBe(70);
    expect(a.ticks).toEqual([30, 40, 50, 60, 70]);
  });

  it('widens a single value', () => {
    const a = styleMapAxis([12]);
    expect(a.min).toBeLessThan(12);
    expect(a.max).toBeGreaterThan(12);
  });

  it('ignores non-finite values', () => {
    expect(styleMapAxis([Number.NaN, 10, 14]).ticks.length).toBeGreaterThan(1);
  });
});

describe('nudgeStyleMap', () => {
  const bounds = { left: 0, right: 500, top: 0, bottom: 500 };

  it('pushes overlapping crests at least a crest apart', () => {
    const out = nudgeStyleMap(
      [
        { id: 'a', x: 100, y: 100 },
        { id: 'b', x: 105, y: 102 },
        { id: 'c', x: 100, y: 100 },
      ],
      28,
      bounds
    );
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        expect(Math.hypot(out[i].x - out[j].x, out[i].y - out[j].y)).toBeGreaterThan(27);
      }
    }
  });

  it('leaves crests that do not overlap where they are', () => {
    const pts = [
      { id: 'a', x: 100, y: 100 },
      { id: 'b', x: 300, y: 300 },
    ];
    expect(nudgeStyleMap(pts, 28, bounds)).toEqual(pts);
  });

  it('keeps crests inside the plot', () => {
    const out = nudgeStyleMap(
      [
        { id: 'a', x: 2, y: 2 },
        { id: 'b', x: 4, y: 4 },
      ],
      28,
      bounds
    );
    for (const p of out) {
      expect(p.x).toBeGreaterThanOrEqual(14);
      expect(p.y).toBeGreaterThanOrEqual(14);
    }
  });
});
