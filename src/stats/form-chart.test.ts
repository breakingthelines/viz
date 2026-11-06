import { describe, expect, it } from 'vitest';
import {
  clampWindowEnd,
  computeWindowStats,
  formatWindowRange,
  formBarAccessibleName,
  formChartBarWidth,
  formChartGridValues,
  formOpponentCode,
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

describe('formChartBarWidth', () => {
  it('divides the plot width by the window size, not by how many matches are loaded', () => {
    // Mock: `bw = (W - L*2) / n`, W=680, L=8, n the window size.
    expect(formChartBarWidth(10)).toBeCloseTo((680 - 16) / 10, 5);
  });

  it('grows the bars when the window itself is smaller', () => {
    expect(formChartBarWidth(3)).toBeCloseTo((680 - 16) / 3, 5);
  });
});

describe('formBarAccessibleName', () => {
  it('carries the date, opponent, result, rating and G/A — not just result and opponent', () => {
    const name = formBarAccessibleName(
      match({
        id: 'a',
        date: '8 Sep 2026',
        opponent: { label: 'AZ' },
        result: 'W',
        score: '2-1',
        venue: 'H',
        rating: 7.4,
        goals: 1,
        assists: 1,
      })
    );
    expect(name).toContain('8 Sep 2026');
    expect(name).toContain('Won 2-1 vs AZ');
    expect(name).toContain('home');
    expect(name).toContain('rating 7.4');
    expect(name).toContain('1 goal');
    expect(name).toContain('1 assist');
  });

  it('omits goal/assist mentions when there are none', () => {
    const name = formBarAccessibleName(match({ id: 'a', goals: 0, assists: 0 }));
    expect(name).not.toContain('goal');
    expect(name).not.toContain('assist');
  });

  it('pluralises more than one goal or assist', () => {
    const name = formBarAccessibleName(match({ id: 'a', goals: 2, assists: 3 }));
    expect(name).toContain('2 goals');
    expect(name).toContain('3 assists');
  });
});

describe('formOpponentCode', () => {
  it('takes three letters of the short name', () => {
    expect(formOpponentCode({ label: 'Fulham' })).toBe('FUL');
    expect(formOpponentCode({ label: 'Brighton & Hove Albion', shortLabel: 'Brighton' })).toBe(
      'BRI'
    );
  });

  it('skips spaces and punctuation', () => {
    expect(formOpponentCode({ label: 'A.F.C. Wimbledon' })).toBe('AFC');
    expect(formOpponentCode({ label: 'Go Ahead Eagles', shortLabel: "Go A'head" })).toBe('GOA');
  });
});
