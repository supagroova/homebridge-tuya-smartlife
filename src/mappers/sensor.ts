import type { TuyaDevice } from '../discovery/types';
import { parseIntegerSpec, scaleTuyaInteger } from './scaling';

export type SensorServiceType =
  | 'temperature'
  | 'humidity'
  | 'contact'
  | 'motion'
  | 'leak'
  | 'smoke'
  | 'battery';

export type SensorCharacteristic =
  | 'currentTemperature'
  | 'currentRelativeHumidity'
  | 'contactSensorState'
  | 'motionDetected'
  | 'leakDetected'
  | 'smokeDetected'
  | 'batteryLevel'
  | 'statusLowBattery';

export type SensorMapping = {
  code: string;
  serviceType: SensorServiceType;
  characteristic: SensorCharacteristic;
  value: boolean | number;
};

export function buildSensorMappings(device: TuyaDevice): SensorMapping[] {
  if (device.category === 'wsdcg') {
    return buildTemperatureHumidityMappings(device);
  }

  const binaryMapping = buildBinarySensorMapping(device);

  return binaryMapping ? [binaryMapping] : [];
}

export function buildBatteryMappings(device: TuyaDevice): SensorMapping[] {
  const mappings: SensorMapping[] = [];
  const levelCode = ['battery_percentage', 'battery_value', 'va_battery'].find(
    (code) => typeof device.status[code] === 'number',
  );

  if (levelCode) {
    mappings.push({
      code: levelCode,
      serviceType: 'battery',
      characteristic: 'batteryLevel',
      value: device.status[levelCode] as number,
    });
  }

  if ('battery_state' in device.status) {
    mappings.push({
      code: 'battery_state',
      serviceType: 'battery',
      characteristic: 'statusLowBattery',
      value: isLowBatteryValue(device.status.battery_state),
    });
  }

  return mappings;
}

function buildTemperatureHumidityMappings(device: TuyaDevice): SensorMapping[] {
  const mappings: SensorMapping[] = [];
  const temperature = scaledMapping(device, ['va_temperature', 'temp_current'], 'temperature', 'currentTemperature');
  const humidity = scaledMapping(device, ['va_humidity', 'humidity_value'], 'humidity', 'currentRelativeHumidity');

  if (temperature) {
    mappings.push(temperature);
  }

  if (humidity) {
    mappings.push(humidity);
  }

  return mappings;
}

function scaledMapping(
  device: TuyaDevice,
  codes: string[],
  serviceType: SensorServiceType,
  characteristic: SensorCharacteristic,
): SensorMapping | undefined {
  const code = codes.find((candidate) => typeof device.status[candidate] === 'number');

  if (!code) {
    return undefined;
  }

  const statusRange = device.statusRanges[code];
  const spec = statusRange ? parseIntegerSpec(statusRange) : undefined;
  const value = scaleTuyaInteger(device.status[code] as number, spec);

  if (value === undefined) {
    return undefined;
  }

  return {
    code,
    serviceType,
    characteristic,
    value,
  };
}

function buildBinarySensorMapping(device: TuyaDevice): SensorMapping | undefined {
  if (device.category === 'mcs' && 'doorcontact_state' in device.status) {
    return {
      code: 'doorcontact_state',
      serviceType: 'contact',
      characteristic: 'contactSensorState',
      value: device.status.doorcontact_state === true,
    };
  }

  if (device.category === 'pir' && 'pir' in device.status) {
    return {
      code: 'pir',
      serviceType: 'motion',
      characteristic: 'motionDetected',
      value: device.status.pir === 'pir',
    };
  }

  if (device.category === 'sj' && 'watersensor_state' in device.status) {
    return {
      code: 'watersensor_state',
      serviceType: 'leak',
      characteristic: 'leakDetected',
      value: device.status.watersensor_state === '1' || device.status.watersensor_state === 'alarm',
    };
  }

  const smokeCode = ['smoke_sensor_status', 'smoke_sensor_state'].find((code) => code in device.status);

  if (device.category === 'ywbj' && smokeCode) {
    return {
      code: smokeCode,
      serviceType: 'smoke',
      characteristic: 'smokeDetected',
      value: device.status[smokeCode] === 'alarm',
    };
  }

  return undefined;
}

function isLowBatteryValue(value: unknown): boolean {
  return value === true || value === 'low' || value === '1' || value === 1;
}
