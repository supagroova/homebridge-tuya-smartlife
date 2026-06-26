import type { TuyaDevice } from '../discovery/types';
import { buildBatteryMappings, buildSensorMappings, type SensorMapping } from '../mappers/sensor';
import { createStatusReader } from './statusReader';

type CharacteristicLike = {
  onGet(handler: () => unknown): CharacteristicLike;
};

type ServiceLike = {
  getCharacteristic(characteristic: unknown): CharacteristicLike;
};

type AccessoryLike = {
  context: Record<string, unknown>;
  getServiceById(serviceConstructor: unknown, subType: string): ServiceLike | undefined;
  addService(serviceConstructor: unknown, displayName: string, subType: string): ServiceLike;
};

type HapLike = {
  Service: {
    TemperatureSensor: unknown;
    HumiditySensor: unknown;
    ContactSensor: unknown;
    MotionSensor: unknown;
    LeakSensor: unknown;
    SmokeSensor: unknown;
    Battery: unknown;
  };
  Characteristic: {
    CurrentTemperature: unknown;
    CurrentRelativeHumidity: unknown;
    ContactSensorState: unknown;
    MotionDetected: unknown;
    LeakDetected: unknown;
    SmokeDetected: unknown;
    BatteryLevel: unknown;
    StatusLowBattery: unknown;
  };
};

export type BindSensorAccessoryOptions = {
  hap: HapLike;
  accessory: AccessoryLike;
  device: TuyaDevice;
  getDevice?: (deviceId: string) => TuyaDevice | undefined;
  communicationFailure?: () => Error;
};

export function bindSensorAccessory(options: BindSensorAccessoryOptions): void {
  const sensorMappings = buildSensorMappings(options.device);

  if (sensorMappings.length === 0) {
    return;
  }

  options.accessory.context.tuyaStatus = { ...options.device.status };
  const statusReader = createStatusReader(options);

  for (const mapping of [...sensorMappings, ...buildBatteryMappings(options.device)]) {
    const serviceConstructor = serviceConstructorFor(options.hap, mapping);
    const service = serviceFor(options, serviceConstructor, mapping);

    service
      .getCharacteristic(characteristicFor(options.hap, mapping))
      .onGet(() => currentMappingValue(statusReader.requireOnlineDevice(), mapping));
  }
}

function currentMappingValue(device: TuyaDevice, mapping: SensorMapping): boolean | number | undefined {
  return [...buildSensorMappings(device), ...buildBatteryMappings(device)].find(
    (candidate) =>
      candidate.code === mapping.code &&
      candidate.serviceType === mapping.serviceType &&
      candidate.characteristic === mapping.characteristic,
  )?.value;
}

function serviceFor(
  options: BindSensorAccessoryOptions,
  serviceConstructor: unknown,
  mapping: SensorMapping,
): ServiceLike {
  const subType = mapping.serviceType === 'battery' ? 'battery' : mapping.code;

  return (
    options.accessory.getServiceById(serviceConstructor, subType) ??
    options.accessory.addService(serviceConstructor, displayNameFor(options.device.name, mapping), subType)
  );
}

function serviceConstructorFor(hap: HapLike, mapping: SensorMapping): unknown {
  switch (mapping.serviceType) {
    case 'temperature':
      return hap.Service.TemperatureSensor;
    case 'humidity':
      return hap.Service.HumiditySensor;
    case 'contact':
      return hap.Service.ContactSensor;
    case 'motion':
      return hap.Service.MotionSensor;
    case 'leak':
      return hap.Service.LeakSensor;
    case 'smoke':
      return hap.Service.SmokeSensor;
    case 'battery':
      return hap.Service.Battery;
  }
}

function characteristicFor(hap: HapLike, mapping: SensorMapping): unknown {
  switch (mapping.characteristic) {
    case 'currentTemperature':
      return hap.Characteristic.CurrentTemperature;
    case 'currentRelativeHumidity':
      return hap.Characteristic.CurrentRelativeHumidity;
    case 'contactSensorState':
      return hap.Characteristic.ContactSensorState;
    case 'motionDetected':
      return hap.Characteristic.MotionDetected;
    case 'leakDetected':
      return hap.Characteristic.LeakDetected;
    case 'smokeDetected':
      return hap.Characteristic.SmokeDetected;
    case 'batteryLevel':
      return hap.Characteristic.BatteryLevel;
    case 'statusLowBattery':
      return hap.Characteristic.StatusLowBattery;
  }
}

function displayNameFor(deviceName: string, mapping: SensorMapping): string {
  const suffixByServiceType: Record<string, string> = {
    temperature: 'Temperature',
    humidity: 'Humidity',
    contact: 'Contact',
    motion: 'Motion',
    leak: 'Leak',
    smoke: 'Smoke',
    battery: 'Battery',
  };

  return `${deviceName} ${suffixByServiceType[mapping.serviceType]}`;
}
