import { describe, expect, it } from 'vitest';
import {
  seasonLinesGridStep,
  seasonLinesGridValues,
  seasonLinesRuns,
  seasonLinesXFor,
  seasonLinesYMax,
  type SeasonLinesSeries,
} from './season-lines';

describe('seasonLinesYMax', () => {
  it('floors to a small fixed ceiling when every value is null or zero', () => {
    const series: SeasonLinesSeries[] = [{ label: 'a', role: 'subject', values: [null, null] }];
    expect(seasonLinesYMax(series)).toBe(4);
  });

  it("matches the mock's fixed ymax of 4 for its own per-90 scale", () => {
    // Mock values stay well under 4 (`prof/build.py:seasons_chart` fixes
    // `ymax = 4.0` regardless of the actual data).
    const series: SeasonLinesSeries[] = [
      { label: 'a', role: 'subject', values: [1.2, 3.4, null] },
      { label: 'b', role: 'secondary', values: [0.5, 2.1] },
    ];
    expect(seasonLinesYMax(series)).toBe(4);
  });

  it('holds the floor of 4 even when a value lands exactly on a step', () => {
    const series: SeasonLinesSeries[] = [{ label: 'a', role: 'subject', values: [2] }];
    expect(seasonLinesYMax(series)).toBe(4);
  });

  it('rounds up past the floor once a series exceeds it, with a nice step', () => {
    // A per-90-minutes count in the dozens (spec: "generalised for
    // team/manager templates"), not a per-90 rate.
    const series: SeasonLinesSeries[] = [{ label: 'a', role: 'subject', values: [48, 62] }];
    expect(seasonLinesYMax(series)).toBe(80);
    expect(seasonLinesGridStep(series)).toBe(20);
  });
});

describe('seasonLinesGridStep', () => {
  it('is 1 at the mock scale, giving 5 gridlines for ymax 4', () => {
    const series: SeasonLinesSeries[] = [{ label: 'a', role: 'subject', values: [1.9] }];
    expect(seasonLinesGridStep(series)).toBe(1);
    expect(seasonLinesGridValues(seasonLinesYMax(series), seasonLinesGridStep(series))).toEqual([
      0, 1, 2, 3, 4,
    ]);
  });

  it('never draws one gridline per unit across a wide per-90-minutes range', () => {
    const series: SeasonLinesSeries[] = [{ label: 'a', role: 'subject', values: [62] }];
    const yMax = seasonLinesYMax(series);
    const step = seasonLinesGridStep(series);
    const gridlineCount = seasonLinesGridValues(yMax, step).length;
    expect(gridlineCount).toBeLessThanOrEqual(6);
    expect(gridlineCount).toBeGreaterThanOrEqual(4);
  });
});

describe('seasonLinesGridValues', () => {
  it('runs 0 to yMax inclusive, one per step', () => {
    expect(seasonLinesGridValues(4, 1)).toEqual([0, 1, 2, 3, 4]);
  });

  it('defaults to a step of 1 when none is passed', () => {
    expect(seasonLinesGridValues(3)).toEqual([0, 1, 2, 3]);
  });
});

describe('seasonLinesXFor', () => {
  it('matches the mock exactly for four seasons (prof/build.py:seasons_chart)', () => {
    // `xs = [L + 70 + i * (W - L - 160) / (n-1) for i in range(n)]`, with
    // L=40, W=1060 -> first point at 110, last at 970.
    expect(seasonLinesXFor(0, 4)).toBeCloseTo(110, 5);
    expect(seasonLinesXFor(3, 4)).toBeCloseTo(970, 5);
  });

  it('spaces points evenly across the data span', () => {
    expect(seasonLinesXFor(1, 4)).toBeCloseTo(110 + 860 / 3, 5);
    expect(seasonLinesXFor(2, 4)).toBeCloseTo(110 + (2 * 860) / 3, 5);
  });

  it('centres a single point in the data span rather than its left edge', () => {
    expect(seasonLinesXFor(0, 1)).toBeCloseTo((110 + 970) / 2, 5);
  });
});

describe('seasonLinesRuns', () => {
  it('is one run when there are no gaps', () => {
    const runs = seasonLinesRuns([1, 2, 3]);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toEqual([
      { index: 0, value: 1 },
      { index: 1, value: 2 },
      { index: 2, value: 3 },
    ]);
  });

  it('breaks into separate runs around a null, rather than interpolating across the gap', () => {
    const runs = seasonLinesRuns([1, null, 3, 4]);
    expect(runs).toHaveLength(2);
    expect(runs[0]).toEqual([{ index: 0, value: 1 }]);
    expect(runs[1]).toEqual([
      { index: 2, value: 3 },
      { index: 3, value: 4 },
    ]);
  });

  it('is empty when every value is null', () => {
    expect(seasonLinesRuns([null, null])).toEqual([]);
  });
});
