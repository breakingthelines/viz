import { describe, expect, it } from 'vitest';
import {
  EMPTY_SUBJECT,
  filterByMinute,
  inMinuteWindow,
  normalizeWindow,
  sameSelection,
  selectionSubject,
  withoutSubject,
} from './selection';

describe('normalizeWindow', () => {
  it('passes an ordered window through', () => {
    expect(normalizeWindow({ from: 20, to: 45 })).toEqual({ from: 20, to: 45 });
  });
  it('swaps reversed bounds', () => {
    expect(normalizeWindow({ from: 45, to: 20 })).toEqual({ from: 20, to: 45 });
  });
  it('drops a window with a non-finite bound', () => {
    expect(normalizeWindow({ from: Number.NaN, to: 45 })).toBeUndefined();
    expect(normalizeWindow({ from: 0, to: Number.POSITIVE_INFINITY })).toBeUndefined();
  });
  it('treats no window as no window', () => {
    expect(normalizeWindow(undefined)).toBeUndefined();
  });
});

describe('inMinuteWindow', () => {
  it('is inclusive at both ends', () => {
    const w = { from: 20, to: 45 };
    expect(inMinuteWindow(20, w)).toBe(true);
    expect(inMinuteWindow(45, w)).toBe(true);
    expect(inMinuteWindow(19, w)).toBe(false);
    expect(inMinuteWindow(46, w)).toBe(false);
  });
  it('admits every minute without a window', () => {
    expect(inMinuteWindow(120, undefined)).toBe(true);
  });
  it('rejects a non-finite minute inside a window', () => {
    expect(inMinuteWindow(Number.NaN, { from: 0, to: 90 })).toBe(false);
  });
});

describe('filterByMinute', () => {
  const items = [{ minute: 9 }, { minute: 23 }, { minute: 45 }, { minute: 91 }];
  it('keeps the items inside the window', () => {
    expect(filterByMinute(items, (i) => i.minute, { from: 20, to: 45 })).toEqual([
      { minute: 23 },
      { minute: 45 },
    ]);
  });
  it('returns the same array when there is no window', () => {
    expect(filterByMinute(items, (i) => i.minute, undefined)).toBe(items);
  });
});

describe('sameSelection', () => {
  it('compares nested plain objects structurally', () => {
    expect(
      sameSelection(
        { filter: { kind: 'type', type: 'pass' }, activePlayer: null },
        { filter: { kind: 'type', type: 'pass' }, activePlayer: null }
      )
    ).toBe(true);
    expect(
      sameSelection(
        { filter: { kind: 'type', type: 'pass' }, activePlayer: null },
        { filter: { kind: 'type', type: 'carry' }, activePlayer: null }
      )
    ).toBe(false);
  });
  it('ignores keys whose value is undefined', () => {
    expect(sameSelection({ activeId: undefined }, {})).toBe(true);
  });
  it('tells null from a value', () => {
    expect(sameSelection({ selectedId: null }, { selectedId: 'fr-griezmann' })).toBe(false);
  });
});

describe('selectionSubject', () => {
  it('defaults every missing field to null', () => {
    expect(selectionSubject({ team: 'France' })).toEqual({
      playerId: null,
      playerName: null,
      team: 'France',
    });
    expect(selectionSubject()).toEqual(EMPTY_SUBJECT);
  });
});

describe('withoutSubject', () => {
  it('drops a stored subject from a seed', () => {
    expect(
      withoutSubject({
        goalId: 'messi-23',
        subject: { playerId: null, playerName: 'x', team: null },
      })
    ).toEqual({ goalId: 'messi-23' });
  });
  it('returns a seed without one unchanged', () => {
    const seed = { goalId: 'messi-23' };
    expect(withoutSubject(seed)).toBe(seed);
  });
});
