import { describe, expect, it } from 'vitest';
import { leagueLadderBarWidth } from './league-ladder';

describe('leagueLadderBarWidth', () => {
  it('passes a normal index through unchanged', () => {
    expect(leagueLadderBarWidth(82)).toBe(82);
  });

  it('clamps a negative index to 0', () => {
    expect(leagueLadderBarWidth(-5)).toBe(0);
  });

  it('clamps an index above 100 to 100', () => {
    expect(leagueLadderBarWidth(307)).toBe(100);
  });

  it('treats a non-finite index as 0', () => {
    expect(leagueLadderBarWidth(Number.NaN)).toBe(0);
  });
});
