import { buildThermostatMapping } from './thermostat';
import type { TuyaDevice, TuyaDeviceFunction } from '../discovery/types';

function integerSpec(
  code: string,
  values: { min: number; max: number; scale: number; step: number },
): TuyaDeviceFunction {
  return {
    code,
    type: 'Integer',
    values: JSON.stringify(values),
  };
}

function enumSpec(code: string, range: string[]): TuyaDeviceFunction {
  return {
    code,
    type: 'Enum',
    values: JSON.stringify({ range }),
  };
}

function device(overrides: Partial<TuyaDevice> = {}): TuyaDevice {
  return {
    id: 'thermostat-1',
    name: 'Hall Thermostat',
    category: 'wk',
    productId: 'prod-thermostat',
    productName: 'Thermostat',
    online: true,
    homeId: 'home-1',
    status: {
      switch: true,
      temp_current: 211,
      temp_set: 225,
      mode: 'heat',
      battery_percentage: 74,
    },
    functions: {
      temp_set: integerSpec('temp_set', { min: 50, max: 350, scale: 1, step: 5 }),
      mode: enumSpec('mode', ['auto', 'heat']),
    },
    statusRanges: {
      temp_current: integerSpec('temp_current', { min: -200, max: 800, scale: 1, step: 1 }),
      temp_set: integerSpec('temp_set', { min: 50, max: 350, scale: 1, step: 5 }),
    },
    reportTypes: {},
    raw: {},
    ...overrides,
  };
}

describe('buildThermostatMapping', () => {
  it('maps wk current and target temperatures with target constraints', () => {
    const mapping = buildThermostatMapping(device());

    expect(mapping).toMatchObject({
      currentTemperature: 21.1,
      targetTemperature: {
        value: 22.5,
        min: 5,
        max: 35,
        step: 0.5,
      },
      currentState: 'heat',
      targetState: 'heat',
    });
  });

  it('clamps and scales target temperature commands', () => {
    const mapping = buildThermostatMapping(device());

    expect(mapping?.targetTemperature.command(40)).toEqual({ code: 'temp_set', value: 350 });
    expect(mapping?.targetTemperature.command(4)).toEqual({ code: 'temp_set', value: 50 });
    expect(mapping?.targetTemperature.command(21.25)).toEqual({ code: 'temp_set', value: 213 });
  });

  it('maps switch off to off current and target states', () => {
    const mapping = buildThermostatMapping(device({ status: { switch: false, temp_current: 211, temp_set: 225 } }));

    expect(mapping).toMatchObject({
      currentState: 'off',
      targetState: 'off',
    });
  });

  it('generates conservative target mode commands', () => {
    const mapping = buildThermostatMapping(device());

    expect(mapping?.targetStateCommand('off')).toEqual([{ code: 'switch', value: false }]);
    expect(mapping?.targetStateCommand('heat')).toEqual([
      { code: 'switch', value: true },
      { code: 'mode', value: 'heat' },
    ]);
    expect(mapping?.targetStateCommand('auto')).toEqual([
      { code: 'switch', value: true },
      { code: 'mode', value: 'auto' },
    ]);
  });

  it('reuses battery mappings for thermostat devices', () => {
    const mapping = buildThermostatMapping(device());

    expect(mapping?.battery).toEqual([
      {
        code: 'battery_percentage',
        serviceType: 'battery',
        characteristic: 'batteryLevel',
        value: 74,
      },
    ]);
  });

  it('returns undefined for unsupported categories or missing temperature specs', () => {
    expect(buildThermostatMapping(device({ category: 'wsdcg' }))).toBeUndefined();
    expect(buildThermostatMapping(device({ statusRanges: {} }))).toBeUndefined();
  });
});
