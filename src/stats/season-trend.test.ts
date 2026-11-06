import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  SEASON_TREND_UNRANKED_Y,
  SeasonTrend,
  seasonTrendReading,
  seasonTrendRuns,
  seasonTrendX,
  seasonTrendY,
} from './season-trend';

describe('seasonTrendY', () => {
  it('puts 100 at the top of the band and 0 at its foot', () => {
    expect(seasonTrendY(100)).toBeLessThan(seasonTrendY(50));
    expect(seasonTrendY(50)).toBeLessThan(seasonTrendY(0));
  });

  it('clamps out-of-range and non-finite percentiles', () => {
    expect(seasonTrendY(140)).toBe(seasonTrendY(100));
    expect(seasonTrendY(-3)).toBe(seasonTrendY(0));
    expect(seasonTrendY(Number.NaN)).toBe(seasonTrendY(0));
  });

  it('keeps the no-ranking lane under the scale', () => {
    expect(SEASON_TREND_UNRANKED_Y).toBeGreaterThan(seasonTrendY(0));
  });
});

describe('seasonTrendX', () => {
  it('centres each season in its column', () => {
    expect(seasonTrendX(0, 4)).toBeCloseTo(12.5);
    expect(seasonTrendX(3, 4)).toBeCloseTo(87.5);
    expect(seasonTrendX(0, 1)).toBe(50);
  });
});

describe('seasonTrendRuns', () => {
  it('joins consecutive ranked seasons', () => {
    expect(
      seasonTrendRuns([
        { value: 1, percentile: 90 },
        { value: 1, percentile: 80 },
        { value: 1, percentile: 70 },
      ])
    ).toEqual([[0, 1, 2]]);
  });

  it('breaks at a season with no ranking or no value, and drops lone points', () => {
    expect(
      seasonTrendRuns([
        { value: 1, percentile: 90 },
        { value: 1, percentile: null },
        { value: 1, percentile: 70 },
        { value: 1, percentile: 60 },
        { value: null, percentile: null },
        { value: 1, percentile: 50 },
      ])
    ).toEqual([[2, 3]]);
  });
});

describe('seasonTrendReading', () => {
  it('reads the value and the percentile ordinal', () => {
    expect(seasonTrendReading({ value: 0.834, percentile: 93.6 }, 'per90')).toBe(
      '0.83 per 90, 94th percentile'
    );
    expect(seasonTrendReading({ value: 58, percentile: 81 }, 'percent')).toBe(
      '58%, 81st percentile'
    );
  });

  it('says when a season is not ranked, and when there is no value', () => {
    expect(seasonTrendReading({ value: 2.1, percentile: null }, 'per90')).toBe(
      '2.10 per 90, not ranked'
    );
    expect(seasonTrendReading({ value: null, percentile: null }, 'per90')).toBe('No data');
  });
});

describe('SeasonTrend server render', () => {
  const html = renderToStaticMarkup(
    createElement(SeasonTrend, {
      seasons: [
        { label: '2025-26', caption: 'Chelsea, 2,412 min' },
        { label: '2026-27', caption: 'Chelsea, 886 min' },
      ],
      rows: [
        {
          key: 'key',
          label: 'Key passes',
          unit: 'per90',
          points: [
            { value: 1.84, percentile: 79 },
            { value: 2.26, percentile: 95 },
          ],
        },
      ],
    })
  );

  it('labels each point with its value and never prints the ramp threshold', () => {
    expect(html).toContain('1.84');
    expect(html).toContain('2.26');
    expect(html).not.toMatch(/>90</);
  });

  it('paints a 95th percentile point full BTL red and a 79th one short of it', () => {
    expect(html).toContain('background:#eb0000');
    expect(html.match(/background:#eb0000/g)?.length).toBe(1);
  });

  it('draws no wordmark', () => {
    expect(html).not.toContain('data-mark');
  });
});
