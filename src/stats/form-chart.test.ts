import { describe, expect, it } from 'vitest';
import {
  clampWindowEnd,
  computeWindowStats,
  formatWindowRange,
  formChartGridValues,
  goalAssistMarker,
  type FormChartMatch,
} from './form-chart';

function match(partial: Partial<FormChartMatch> & { id: string }): FormChartMatch {
  return {
    date: '1 Jan',
    opponent: { label: 'Opponent' },
    result: 'W',
    score: '1-0',
    venue: 'H',
    minutes: 90,
    goals: 0,
    assists: 0,
    rating: 7,
    title: '',
    ...partial,
  };
}

describe('clampWindowEnd', () => {
  it('never shows fewer than the window size', () => {
    expect(clampWindowEnd(20, 3, 10)).toBe(10);
  });

  it('never runs past the end of what is loaded', () => {
    expect(clampWindowEnd(20, 25, 10)).toBe(20);
  });

  it('passes an in-range end through unchanged', () => {
    expect(clampWindowEnd(20, 15, 10)).toBe(15);
  });
});

describe('goalAssistMarker', () => {
  it('is empty with no goals or assists', () => {
    expect(goalAssistMarker(0, 0)).toBe('');
  });

  it('repeats G then A (mock: Array(g+1).join("G")+Array(a+1).join("A"))', () => {
    expect(goalAssistMarker(1, 1)).toBe('GA');
    expect(goalAssistMarker(2, 0)).toBe('GG');
    expect(goalAssistMarker(0, 3)).toBe('AAA');
  });

  it('never goes negative on a malformed count', () => {
    expect(goalAssistMarker(-1, -1)).toBe('');
  });
});

describe('formChartGridValues', () => {
  it('matches the mock default domain exactly: [6,7,8,9,10] for [5,10]', () => {
    expect(formChartGridValues([5, 10])).toEqual([6, 7, 8, 9, 10]);
  });

  it('starts one above the low end for a non-integer-adjacent domain', () => {
    expect(formChartGridValues([0, 3])).toEqual([1, 2, 3]);
  });
});

describe('computeWindowStats', () => {
  it('returns zeros for an empty window', () => {
    expect(computeWindowStats([])).toEqual({ averageRating: 0, goals: 0, assists: 0, minutes: 0 });
  });

  it('averages rating and sums the rest over the visible matches', () => {
    const stats = computeWindowStats([
      match({ id: 'a', rating: 6, goals: 1, assists: 0, minutes: 90 }),
      match({ id: 'b', rating: 8, goals: 0, assists: 2, minutes: 45 }),
    ]);
    expect(stats.averageRating).toBe(7);
    expect(stats.goals).toBe(1);
    expect(stats.assists).toBe(2);
    expect(stats.minutes).toBe(135);
  });
});

describe('formatWindowRange', () => {
  it('is empty for no matches', () => {
    expect(formatWindowRange([])).toBe('');
  });

  it('spans the first to the last visible match date', () => {
    const range = formatWindowRange([
      match({ id: 'a', date: '8 Sep 2026' }),
      match({ id: 'b', date: '2 Nov 2026' }),
    ]);
    expect(range).toBe('8 Sep 2026 to 2 Nov 2026');
  });
});
