import { bindSensorAccessory } from './sensorAccessory';
import type { TuyaDevice, TuyaDeviceFunction } from '../discovery/types';

type GetHandler = () => unknown;

class FakeCharacteristic {
  getHandler?: GetHandler;

  onGet(handler: GetHandler): this {
    this.getHandler = handler;
    return this;
  }
}

class FakeService {
  readonly characteristics = new Map<unknown, FakeCharacteristic>();

  constructor(
    readonly constructorToken: unknown,
    readonly displayName: string,
    readonly subType: string,
  ) {}

  getCharacteristic(characteristic: unknown): FakeCharacteristic {
    let fakeCharacteristic = this.characteristics.get(characteristic);

    if (!fakeCharacteristic) {
      fakeCharacteristic = new FakeCharacteristic();
      this.characteristics.set(characteristic, fakeCharacteristic);
    }

    return fakeCharacteristic;
  }
}

class FakeAccessory {
  context: Record<string, unknown> = {};
  readonly services: FakeService[] = [];

  getServiceById(constructorToken: unknown, subType: string): FakeService | undefined {
    return this.services.find(
      (service) => service.constructorToken === constructorToken && service.subType === subType,
    );
  }

  addService(constructorToken: unknown, displayName: string, subType: string): FakeService {
    const service = new FakeService(constructorToken, displayName, subType);
    this.services.push(service);
    return service;
  }
}

const hap = {
  Service: {
    TemperatureSensor: Symbol('TemperatureSensor'),
    HumiditySensor: Symbol('HumiditySensor'),
    ContactSensor: Symbol('ContactSensor'),
    MotionSensor: Symbol('MotionSensor'),
    LeakSensor: Symbol('LeakSensor'),
    SmokeSensor: Symbol('SmokeSensor'),
    Battery: Symbol('Battery'),
  },
  Characteristic: {
    CurrentTemperature: Symbol('CurrentTemperature'),
    CurrentRelativeHumidity: Symbol('CurrentRelativeHumidity'),
    ContactSensorState: Symbol('ContactSensorState'),
    MotionDetected: Symbol('MotionDetected'),
    LeakDetected: Symbol('LeakDetected'),
    SmokeDetected: Symbol('SmokeDetected'),
    BatteryLevel: Symbol('BatteryLevel'),
    StatusLowBattery: Symbol('StatusLowBattery'),
  },
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
      battery_percentage: 88,
      battery_state: 'normal',
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

describe('bindSensorAccessory', () => {
  it('creates temperature, humidity, and battery services with cached getters', () => {
    const accessory = new FakeAccessory();

    bindSensorAccessory({ hap, accessory, device: device() });

    expect(accessory.services.map((service) => service.constructorToken)).toEqual([
      hap.Service.TemperatureSensor,
      hap.Service.HumiditySensor,
      hap.Service.Battery,
    ]);
    expect(
      accessory.services[0]?.getCharacteristic(hap.Characteristic.CurrentTemperature).getHandler?.(),
    ).toBe(23.5);
    expect(
      accessory.services[1]?.getCharacteristic(hap.Characteristic.CurrentRelativeHumidity).getHandler?.(),
    ).toBe(48.7);
    expect(accessory.services[2]?.getCharacteristic(hap.Characteristic.BatteryLevel).getHandler?.()).toBe(88);
    expect(accessory.services[2]?.getCharacteristic(hap.Characteristic.StatusLowBattery).getHandler?.()).toBe(
      false,
    );
  });

  it('reads updated temperature and humidity values from getDevice', () => {
    const accessory = new FakeAccessory();

    bindSensorAccessory({
      hap,
      accessory,
      device: device(),
      getDevice: () =>
        device({
          status: {
            va_temperature: 201,
            va_humidity: 402,
            battery_percentage: 50,
            battery_state: 'low',
          },
        }),
      communicationFailure: () => new Error('offline'),
    });

    expect(accessory.services[0]?.getCharacteristic(hap.Characteristic.CurrentTemperature).getHandler?.()).toBe(
      20.1,
    );
    expect(
      accessory.services[1]?.getCharacteristic(hap.Characteristic.CurrentRelativeHumidity).getHandler?.(),
    ).toBe(40.2);
    expect(accessory.services[2]?.getCharacteristic(hap.Characteristic.BatteryLevel).getHandler?.()).toBe(50);
    expect(accessory.services[2]?.getCharacteristic(hap.Characteristic.StatusLowBattery).getHandler?.()).toBe(
      true,
    );
  });

  it('throws communication failure for offline sensor getters', () => {
    const accessory = new FakeAccessory();

    bindSensorAccessory({
      hap,
      accessory,
      device: device(),
      getDevice: () => device({ online: false }),
      communicationFailure: () => new Error('offline'),
    });

    expect(() =>
      accessory.services[0]?.getCharacteristic(hap.Characteristic.CurrentTemperature).getHandler?.(),
    ).toThrow('offline');
  });

  it('creates binary sensor services from category-specific mappings', () => {
    const accessory = new FakeAccessory();

    bindSensorAccessory({
      hap,
      accessory,
      device: device({ category: 'pir', status: { pir: 'pir' }, statusRanges: {} }),
    });

    expect(accessory.services).toHaveLength(1);
    expect(accessory.services[0]).toMatchObject({
      constructorToken: hap.Service.MotionSensor,
      displayName: 'Hall Sensor Motion',
      subType: 'pir',
    });
    expect(accessory.services[0]?.getCharacteristic(hap.Characteristic.MotionDetected).getHandler?.()).toBe(true);
  });

  it('reuses existing services by service type and subtype', () => {
    const accessory = new FakeAccessory();
    const existing = accessory.addService(hap.Service.TemperatureSensor, 'Existing', 'va_temperature');

    bindSensorAccessory({ hap, accessory, device: device() });

    expect(accessory.services[0]).toBe(existing);
  });

  it('does nothing when the device has no sensor mappings', () => {
    const accessory = new FakeAccessory();

    bindSensorAccessory({ hap, accessory, device: device({ category: 'dj' }) });

    expect(accessory.services).toEqual([]);
  });
});
