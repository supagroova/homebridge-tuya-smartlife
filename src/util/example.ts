/**
 * Clamp `value` into the inclusive range [min, max].
 *
 * A tiny pure helper that exists only to prove the jest + ts-jest + coverage
 * wiring works (the single allowed smoke test for the bootstrap phase). It is
 * NOT part of the plugin's behaviour and will be removed/replaced once real
 * modules land.
 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError(`clamp: min (${min}) must not exceed max (${max})`);
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
