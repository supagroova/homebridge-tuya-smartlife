/**
 * Clamp `value` into the inclusive range [min, max].
 *
 * A tiny pure helper that exists only to prove the jest + ts-jest + coverage
 * wiring works (the single allowed smoke test for the bootstrap phase). It is
 * NOT part of the plugin's behaviour and will be removed/replaced once real
 * modules land.
 */
export declare function clamp(value: number, min: number, max: number): number;
