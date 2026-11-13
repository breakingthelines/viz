import { describe, expect, it } from 'vitest';
import { countLabel } from './count';

describe('countLabel', () => {
  it('is singular for one and plural otherwise, grouped the British way', () => {
    expect(countLabel(1, 'vote')).toBe('1 vote');
    expect(countLabel(0, 'goal')).toBe('0 goals');
    expect(countLabel(2410, 'reader')).toBe('2,410 readers');
    expect(countLabel(1, 'pass', 'passes')).toBe('1 pass');
    expect(countLabel(3, 'pass', 'passes')).toBe('3 passes');
  });
});
