import { clamp } from './example';

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min when below range', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  it('clamps to max when above range', () => {
    expect(clamp(42, 0, 10)).toBe(10);
  });

  it('returns the boundary values unchanged', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('throws when min exceeds max', () => {
    expect(() => clamp(1, 10, 0)).toThrow(RangeError);
  });
});
