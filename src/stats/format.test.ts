import { describe, expect, it } from 'vitest';
import { formatMetricValue, formatPercentile, ordinal } from './format';

describe('ordinal', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [23, '23rd'],
    [84, '84th'],
    [90, '90th'],
    [100, '100th'],
    [111, '111th'],
    [113, '113th'],
    [0, '0th'],
  ])('formats %i as %s', (n, expected) => {
    expect(ordinal(n)).toBe(expected);
  });
});

describe('formatMetricValue', () => {
  it('rounds a percent unit to a whole number with a % suffix', () => {
    expect(formatMetricValue(48.2, 'percent')).toBe('48%');
    expect(formatMetricValue(48.6, 'percent')).toBe('49%');
  });

  it('keeps two decimals for a per90 unit', () => {
    expect(formatMetricValue(1.4, 'per90')).toBe('1.40');
    expect(formatMetricValue(0, 'per90')).toBe('0.00');
  });

  it('renders null as an en dash, never a zero (§1.5 null vs zero)', () => {
    expect(formatMetricValue(null, 'per90')).toBe('–');
    expect(formatMetricValue(null, 'percent')).toBe('–');
  });

  it('treats a non-finite value the same as null', () => {
    expect(formatMetricValue(Number.NaN, 'per90')).toBe('–');
  });
});

describe('formatPercentile', () => {
  it('formats a percentile as an ordinal', () => {
    expect(formatPercentile(84)).toBe('84th');
  });

  it('renders null as an en dash', () => {
    expect(formatPercentile(null)).toBe('–');
  });

  it('treats a non-finite percentile the same as null', () => {
    expect(formatPercentile(Number.NaN)).toBe('–');
  });
});
