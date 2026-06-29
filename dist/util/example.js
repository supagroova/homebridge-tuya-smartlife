"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clamp = clamp;
/**
 * Clamp `value` into the inclusive range [min, max].
 *
 * A tiny pure helper that exists only to prove the jest + ts-jest + coverage
 * wiring works (the single allowed smoke test for the bootstrap phase). It is
 * NOT part of the plugin's behaviour and will be removed/replaced once real
 * modules land.
 */
function clamp(value, min, max) {
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
