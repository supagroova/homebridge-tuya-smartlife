import {
  parseIntegerSpec,
  scaleTuyaInteger,
  unscaleTuyaNumber,
} from './scaling';

describe('Tuya integer scaling', () => {
  it('parses integer type metadata and exposes scaled bounds', () => {
    const spec = parseIntegerSpec({
      code: 'temp_current',
      type: 'Integer',
      values: JSON.stringify({
        min: -200,
        max: 800,
        scale: 1,
        step: 5,
        unit: 'C',
      }),
    });

    expect(spec).toEqual({
      min: -200,
      max: 800,
      scale: 1,
      step: 5,
      unit: 'C',
      minScaled: -20,
      maxScaled: 80,
      stepScaled: 0.5,
    });
  });

  it('converts raw Tuya integers to scaled HomeKit values', () => {
    const spec = parseIntegerSpec({
      code: 'temp_current',
      type: 'Integer',
      values: '{"scale":1}',
    });

    expect(scaleTuyaInteger(235, spec)).toBe(23.5);
  });

  it('converts HomeKit numbers back to raw Tuya integers', () => {
    const spec = parseIntegerSpec({
      code: 'temp_set',
      type: 'Integer',
      values: '{"scale":2}',
    });

    expect(unscaleTuyaNumber(12.34, spec)).toBe(1234);
  });

  it('rounds reverse conversion to the nearest integer raw value', () => {
    const spec = parseIntegerSpec({
      code: 'humidity_value',
      type: 'Integer',
      values: '{"scale":1}',
    });

    expect(unscaleTuyaNumber(47.56, spec)).toBe(476);
  });

  it('returns undefined for missing, invalid, or non-integer specs', () => {
    expect(parseIntegerSpec({ code: 'missing', type: 'Integer' })).toBeUndefined();
    expect(parseIntegerSpec({ code: 'bad', type: 'Integer', values: '{' })).toBeUndefined();
    expect(parseIntegerSpec({ code: 'switch_1', type: 'Boolean', values: '{}' })).toBeUndefined();
  });
});
