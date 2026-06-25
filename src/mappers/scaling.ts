import type { TuyaDeviceFunction } from '../discovery/types';

export type TuyaIntegerSpec = {
  min?: number;
  max?: number;
  scale: number;
  step?: number;
  unit?: string;
  minScaled?: number;
  maxScaled?: number;
  stepScaled?: number;
};

type RawIntegerSpec = {
  min?: unknown;
  max?: unknown;
  scale?: unknown;
  step?: unknown;
  unit?: unknown;
};

export function parseIntegerSpec(spec: TuyaDeviceFunction): TuyaIntegerSpec | undefined {
  if (spec.type !== 'Integer' || spec.values === undefined) {
    return undefined;
  }

  const raw = parseValues(spec.values);

  if (raw === undefined) {
    return undefined;
  }

  const scale = numberOrDefault(raw.scale, 0);
  const integerSpec: TuyaIntegerSpec = {
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

export function scaleTuyaInteger(rawValue: number, spec: TuyaIntegerSpec | undefined): number | undefined {
  if (spec === undefined) {
    return undefined;
  }

  return rawValue / 10 ** spec.scale;
}

export function unscaleTuyaNumber(value: number, spec: TuyaIntegerSpec | undefined): number | undefined {
  if (spec === undefined) {
    return undefined;
  }

  return Math.round(value * 10 ** spec.scale);
}

function parseValues(values: string): RawIntegerSpec | undefined {
  try {
    const parsed = JSON.parse(values) as unknown;

    return typeof parsed === 'object' && parsed !== null ? (parsed as RawIntegerSpec) : undefined;
  } catch {
    return undefined;
  }
}

function numberOrDefault(value: unknown, defaultValue: number): number {
  return typeof value === 'number' ? value : defaultValue;
}
