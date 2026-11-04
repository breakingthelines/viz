import { describe, expect, it } from 'vitest';
import { ramp, ratingColour } from './colour';

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

  // Mid-curve reference values, computed with the mock's own formula
  // (`ramp`/`colour`/`colour_w`, `scratchpad/prof/wheel2.py:152-163`). The
  // endpoint-only checks above pass for a linear ramp or for a 1.6 exponent
  // swapped for 1 or 2 — only a mid-curve value pins the actual exponent
  // (1.6) and the actual base grey the curve starts from.
  it.each([
    [20, '#4a3131'],
    [45, '#742424'],
    [60, '#971a1a'],
    [80, '#cd0909'],
  ])('ramps the subject to %s at percentile %i', (p, hex) => {
    expect(ramp(p, 'subject')).toBe(hex);
  });

  it.each([
    [20, '#4c4848'],
    [45, '#7b7878'],
    [60, '#a19f9f'],
    [80, '#dddcdc'],
  ])('ramps a comparison player to %s at percentile %i', (p, hex) => {
    expect(ramp(p, 'comparison')).toBe(hex);
  });

  it('treats a non-finite percentile as the base grey, not an invalid colour', () => {
    // §3.5 stores nulls as NaN server-side, and proto JSON can carry "NaN".
    expect(ramp(Number.NaN, 'subject')).toBe(ramp(0, 'subject'));
    expect(ramp(Number(Number('NaN')), 'comparison')).toBe(ramp(0, 'comparison'));
  });
});

// Reference values for `rating_colour` (`scratchpad/prof/page2.py:46-47`),
// which feeds the form chart's per-match colouring.
describe('ratingColour', () => {
  it('sits at the base grey at or below a rating of 6', () => {
    expect(ratingColour(5)).toBe(ramp(0, 'subject'));
    expect(ratingColour(6)).toBe(ramp(0, 'subject'));
  });

  it('reaches full BTL red at a rating of 8 or above', () => {
    expect(ratingColour(8)).toBe('#eb0000');
    expect(ratingColour(9.5)).toBe('#eb0000');
  });

  it.each([
    [7, '#742424'],
    [7.3, '#931b1b'],
  ])('matches the mock at a rating of %s', (r, hex) => {
    expect(ratingColour(r)).toBe(hex);
  });
});
