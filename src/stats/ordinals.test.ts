import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ComparisonBars } from './comparison-bars';
import { PercentileRows } from './percentile-rows';
import { seasonTrendReading } from './season-trend';
import type { StatMetric } from './stat-metric';

const metric: StatMetric = {
  key: 'npg',
  label: 'npG',
  shortLabel: 'npG',
  group: 'Shooting',
  unit: 'per90',
  value: 0,
  percentile: 7,
  median: null,
  state: 'value',
};

describe('ordinals', () => {
  it('PercentileRows draws the ordinal by default and drops it on request', () => {
    const groups = [{ name: 'Shooting', metrics: [metric] }];
    const shown = renderToStaticMarkup(createElement(PercentileRows, { groups }));
    expect(shown).toContain('percentile-rows-ordinal');
    expect(shown).toContain('7th');
    const hidden = renderToStaticMarkup(createElement(PercentileRows, { groups, ordinals: false }));
    expect(hidden).not.toContain('percentile-rows-ordinal');
    expect(hidden).not.toContain('7th');
    expect(hidden).toContain('0.00');
    expect(hidden).toContain('btl-pr-fill');
  });

  it('ComparisonBars drops the ordinal under each value on request', () => {
    const props = {
      left: { name: 'A' },
      right: { name: 'B' },
      rows: [
        {
          key: 'npg',
          label: 'npG',
          group: 'Shooting',
          unit: 'per90' as const,
          left: { value: 0.1, percentile: 7 },
          right: { value: 0.5, percentile: 91 },
        },
      ],
    };
    expect(renderToStaticMarkup(createElement(ComparisonBars, props))).toContain('91st');
    const hidden = renderToStaticMarkup(
      createElement(ComparisonBars, { ...props, ordinals: false })
    );
    expect(hidden).not.toContain('91st');
    expect(hidden).not.toContain('comparison-bars-ordinal');
    expect(hidden).toContain('0.50');
  });

  it('seasonTrendReading reads the value alone without ordinals', () => {
    expect(seasonTrendReading({ value: 0.83, percentile: 94 }, 'per90')).toBe(
      '0.83 per 90, 94th percentile'
    );
    expect(seasonTrendReading({ value: 0.83, percentile: 94 }, 'per90', false)).toBe('0.83 per 90');
    expect(seasonTrendReading({ value: null, percentile: null }, 'per90', false)).toBe('No data');
    expect(seasonTrendReading({ value: 1.84, percentile: null }, 'per90', false)).toBe(
      '1.84 per 90, not ranked'
    );
  });
});
