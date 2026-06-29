"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIntegerSpec = parseIntegerSpec;
exports.scaleTuyaInteger = scaleTuyaInteger;
exports.unscaleTuyaNumber = unscaleTuyaNumber;
function parseIntegerSpec(spec) {
    if (spec.type !== 'Integer' || spec.values === undefined) {
        return undefined;
    }
    const raw = parseValues(spec.values);
    if (raw === undefined) {
        return undefined;
    }
    const scale = numberOrDefault(raw.scale, 0);
    const integerSpec = {
        scale,
    };
    if (typeof raw.min === 'number') {
        integerSpec.min = raw.min;
        integerSpec.minScaled = scaleTuyaInteger(raw.min, integerSpec);
    }
    if (typeof raw.max === 'number') {
        integerSpec.max = raw.max;
        integerSpec.maxScaled = scaleTuyaInteger(raw.max, integerSpec);
    }
    if (typeof raw.step === 'number') {
        integerSpec.step = raw.step;
        integerSpec.stepScaled = scaleTuyaInteger(raw.step, integerSpec);
    }
    if (typeof raw.unit === 'string') {
        integerSpec.unit = raw.unit;
    }
    return integerSpec;
}
function scaleTuyaInteger(rawValue, spec) {
    if (spec === undefined) {
        return undefined;
    }
    return rawValue / 10 ** spec.scale;
}
function unscaleTuyaNumber(value, spec) {
    if (spec === undefined) {
        return undefined;
    }
    return Math.round(value * 10 ** spec.scale);
}
function parseValues(values) {
    try {
        const parsed = JSON.parse(values);
        return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
    }
    catch {
        return undefined;
    }
}
function numberOrDefault(value, defaultValue) {
    return typeof value === 'number' ? value : defaultValue;
}
