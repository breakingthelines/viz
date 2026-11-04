import { describe, expect, it } from 'vitest';
import { ramp } from './colour';

// Reference values from the approved mock (`scratchpad/prof/wheel2.py`:
// `ramp`/`colour`/`colour_w`), computed with the same formula: this guards
// the ramp against drifting from the mock it is pixel-matched to.
describe('ramp', () => {
  it('returns the base grey at percentile 0', () => {
    expect(ramp(0, 'subject')).toBe('#3a3636');
    expect(ramp(0, 'comparison')).toBe('#3a3636');
  });

  it('returns the base grey for null (no data)', () => {
    expect(ramp(null, 'subject')).toBe(ramp(0, 'subject'));
  });

  it('reaches full BTL red at the 90th percentile for the subject', () => {
    expect(ramp(90, 'subject')).toBe('#eb0000');
  });

  it('never goes past full strength above the 90th percentile', () => {
    expect(ramp(100, 'subject')).toBe('#eb0000');
  });

  it('reaches full white at the 90th percentile for a comparison player', () => {
    expect(ramp(90, 'comparison')).toBe('#ffffff');
  });

  it('is monotonic between 0 and 90', () => {
    const steps = [0, 20, 40, 60, 80, 90];
    const reds = steps.map((p) => Number.parseInt(ramp(p, 'subject').slice(1, 3), 16));
    for (let i = 1; i < reds.length; i++) {
      expect(reds[i]).toBeGreaterThanOrEqual(reds[i - 1]);
    }
  });
});
