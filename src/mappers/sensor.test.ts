import { buildBatteryMappings, buildSensorMappings } from './sensor';
import type { TuyaDevice, TuyaDeviceFunction } from '../discovery/types';

type MappingWithValue = {
  code: string;
  value: unknown;
};

function integerSpec(code: string, scale: number): TuyaDeviceFunction {
  return {
    code,
    type: 'Integer',
    values: JSON.stringify({ min: 0, max: 1000, scale, step: 1 }),
  };
}

function device(overrides: Partial<TuyaDevice> = {}): TuyaDevice {
  return {
    id: 'sensor-1',
    name: 'Hall Sensor',
    category: 'wsdcg',
    productId: 'prod-sensor',
    productName: 'Sensor',
    online: true,
    homeId: 'home-1',
    status: {
      va_temperature: 235,
      va_humidity: 487,
    },
    functions: {},
    statusRanges: {
      va_temperature: integerSpec('va_temperature', 1),
      va_humidity: integerSpec('va_humidity', 1),
    },
    reportTypes: {},
    raw: {},
    ...overrides,
  };
}

describe('buildSensorMappings', () => {
  it('maps wsdcg temperature and humidity using Tuya integer scaling', () => {
    const mappings = buildSensorMappings(device());

    expect(mappings).toEqual([
      {
        code: 'va_temperature',
        serviceType: 'temperature',
        characteristic: 'currentTemperature',
        value: 23.5,
      },
      {
        code: 'va_humidity',
        serviceType: 'humidity',
        characteristic: 'currentRelativeHumidity',
        value: 48.7,
      },
    ]);
  });

  it('supports alternate wsdcg temperature and humidity DP names', () => {
    const mappings = buildSensorMappings(
      device({
        status: {
          temp_current: 214,
          humidity_value: 52,
        },
        statusRanges: {
          temp_current: integerSpec('temp_current', 1),
          humidity_value: integerSpec('humidity_value', 0),
        },
      }),
    );

    expect(codesAndValues(mappings)).toEqual([
      ['temp_current', 21.4],
      ['humidity_value', 52],
    ]);
  });

  it('skips scaled sensor values when the integer spec is missing', () => {
    expect(buildSensorMappings(device({ statusRanges: {} }))).toEqual([]);
  });

  it('maps contact, motion, leak, and smoke sensors with category-specific on values', () => {
    expect(
      buildSensorMappings(
        device({
          category: 'mcs',
          status: { doorcontact_state: true },
        }),
      ),
    ).toEqual([
      {
        code: 'doorcontact_state',
        serviceType: 'contact',
        characteristic: 'contactSensorState',
        value: true,
      },
    ]);

    expect(buildSensorMappings(device({ category: 'pir', status: { pir: 'pir' } }))[0]).toMatchObject({
      serviceType: 'motion',
      value: true,
    });
    expect(buildSensorMappings(device({ category: 'sj', status: { watersensor_state: 'alarm' } }))[0]).toMatchObject({
      serviceType: 'leak',
      value: true,
    });
    expect(
      buildSensorMappings(device({ category: 'ywbj', status: { smoke_sensor_status: 'alarm' } }))[0],
    ).toMatchObject({
      serviceType: 'smoke',
      value: true,
    });
  });

  it('returns false for known binary sensor DPs that are not triggered', () => {
    expect(buildSensorMappings(device({ category: 'pir', status: { pir: 'none' } }))[0]).toMatchObject({
      serviceType: 'motion',
      value: false,
    });
  });

  it('includes optional battery percentage and low-battery mappings', () => {
    expect(
      buildBatteryMappings(
        device({
          status: {
            battery_percentage: 88,
            battery_state: 'low',
          },
        }),
      ),
    ).toEqual([
      {
        code: 'battery_percentage',
        serviceType: 'battery',
        characteristic: 'batteryLevel',
        value: 88,
      },
      {
        code: 'battery_state',
        serviceType: 'battery',
        characteristic: 'statusLowBattery',
        value: true,
      },
    ]);
  });

  it('returns no mappings for unsupported categories', () => {
    expect(buildSensorMappings(device({ category: 'dj' }))).toEqual([]);
  });
});

function codesAndValues(mappings: MappingWithValue[]): unknown[][] {
  return mappings.map((mapping) => [mapping.code, mapping.value]);
}
