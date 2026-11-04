import { describe, expect, it } from 'vitest';
import { groupRows, type ComparisonBarsRow } from './comparison-bars';

function row(
  partial: Partial<ComparisonBarsRow> & { key: string; group: string }
): ComparisonBarsRow {
  return {
    label: partial.key,
    left: { value: null, percentile: null },
    right: { value: null, percentile: null },
    unit: 'per90',
    ...partial,
  };
}

describe('groupRows', () => {
  it('groups rows by their group field, preserving each row within its group', () => {
    const rows = [
      row({ key: 'npg', group: 'Shooting' }),
      row({ key: 'key', group: 'Creating' }),
      row({ key: 'shots', group: 'Shooting' }),
    ];
    const grouped = groupRows(rows);
    expect(grouped.map((g) => g.group)).toEqual(['Shooting', 'Creating']);
    expect(grouped[0].rows.map((r) => r.key)).toEqual(['npg', 'shots']);
    expect(grouped[1].rows.map((r) => r.key)).toEqual(['key']);
  });

  it('orders groups by first appearance, not alphabetically', () => {
    const rows = [row({ key: 'a', group: 'Carrying' }), row({ key: 'b', group: 'Shooting' })];
    expect(groupRows(rows).map((g) => g.group)).toEqual(['Carrying', 'Shooting']);
  });

  it('returns an empty list for no rows', () => {
    expect(groupRows([])).toEqual([]);
  });
});
