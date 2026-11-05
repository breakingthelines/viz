import { describe, expect, it } from 'vitest';
import { orderedItems, type ArchetypeListItem } from './archetype-list';

function item(partial: Partial<ArchetypeListItem> & { id: string }): ArchetypeListItem {
  return {
    name: partial.id,
    percentile: null,
    held: false,
    state: 'value',
    metricKeys: [],
    metricLabels: '',
    ...partial,
  };
}

describe('orderedItems', () => {
  it('sorts value-state items by percentile, highest first', () => {
    const items = [
      item({ id: 'a', percentile: 40 }),
      item({ id: 'b', percentile: 92 }),
      item({ id: 'c', percentile: 65 }),
    ];
    expect(orderedItems(items).map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('puts pending/locked event-only rows after every value row, regardless of percentile', () => {
    const items = [
      item({ id: 'low-value', percentile: 10, state: 'value' }),
      item({ id: 'event-pending', percentile: null, state: 'pending' }),
      item({ id: 'high-value', percentile: 92, state: 'value' }),
      item({ id: 'event-locked', percentile: null, state: 'locked' }),
    ];
    expect(orderedItems(items).map((i) => i.id)).toEqual([
      'high-value',
      'low-value',
      'event-pending',
      'event-locked',
    ]);
  });

  it('keeps the given order among event-only rows (never ranked against each other)', () => {
    const items = [
      item({ id: 'second', state: 'locked' }),
      item({ id: 'first', state: 'pending' }),
    ];
    expect(orderedItems(items).map((i) => i.id)).toEqual(['second', 'first']);
  });

  it('sorts a null-percentile value row after every ranked value row', () => {
    const items = [
      item({ id: 'ranked', percentile: 50, state: 'value' }),
      item({ id: 'no-data', percentile: null, state: 'value' }),
    ];
    expect(orderedItems(items).map((i) => i.id)).toEqual(['ranked', 'no-data']);
  });
});
