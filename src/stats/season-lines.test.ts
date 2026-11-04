import { describe, expect, it } from 'vitest';
import {
  seasonLinesGridValues,
  seasonLinesRuns,
  seasonLinesYMax,
  type SeasonLinesSeries,
} from './season-lines';

describe('seasonLinesYMax', () => {
  it('floors to a small fixed ceiling when every value is null or zero', () => {
    const series: SeasonLinesSeries[] = [{ label: 'a', role: 'subject', values: [null, null] }];
    expect(seasonLinesYMax(series)).toBe(4);
  });

  it('rounds up to the next whole step above the largest value across every series', () => {
    const series: SeasonLinesSeries[] = [
      { label: 'a', role: 'subject', values: [1.2, 3.4, null] },
      { label: 'b', role: 'secondary', values: [0.5, 2.1] },
    ];
    expect(seasonLinesYMax(series)).toBe(4);
  });

  it('never returns the value itself when it lands exactly on a step', () => {
    const series: SeasonLinesSeries[] = [{ label: 'a', role: 'subject', values: [2] }];
    expect(seasonLinesYMax(series)).toBe(3);
  });
});

describe('seasonLinesGridValues', () => {
  it('runs 0 to yMax inclusive, one per step', () => {
    expect(seasonLinesGridValues(4)).toEqual([0, 1, 2, 3, 4]);
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
