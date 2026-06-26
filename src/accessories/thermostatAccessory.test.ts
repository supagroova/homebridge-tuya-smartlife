import { bindThermostatAccessory } from './thermostatAccessory';
import type { TuyaDevice, TuyaDeviceFunction } from '../discovery/types';

type GetHandler = () => unknown;
type SetHandler = (value: unknown) => void | Promise<void>;

class FakeCharacteristic {
  getHandler?: GetHandler;
  setHandler?: SetHandler;

  onGet(handler: GetHandler): this {
    this.getHandler = handler;
    return this;
  }

  onSet(handler: SetHandler): this {
    this.setHandler = handler;
    return this;
  }
}

class FakeService {
  readonly characteristics = new Map<unknown, FakeCharacteristic>();
  readonly setValues = new Map<unknown, unknown>();

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

  setCharacteristic(characteristic: unknown, value: unknown): this {
    this.setValues.set(characteristic, value);
    this.getCharacteristic(characteristic);
    return this;
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
    Thermostat: Symbol('Thermostat'),
    Battery: Symbol('Battery'),
  },
  Characteristic: {
    CurrentTemperature: Symbol('CurrentTemperature'),
    TargetTemperature: Symbol('TargetTemperature'),
    CurrentHeatingCoolingState: {
      token: Symbol('CurrentHeatingCoolingState'),
      OFF: 0,
      HEAT: 1,
      COOL: 2,
    },
    TargetHeatingCoolingState: {
      token: Symbol('TargetHeatingCoolingState'),
      OFF: 0,
      HEAT: 1,
      COOL: 2,
      AUTO: 3,
    },
    TemperatureDisplayUnits: {
      token: Symbol('TemperatureDisplayUnits'),
      CELSIUS: 0,
    },
    BatteryLevel: Symbol('BatteryLevel'),
    StatusLowBattery: Symbol('StatusLowBattery'),
  },
};

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
      battery_state: 'normal',
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

describe('bindThermostatAccessory', () => {
  it('creates thermostat and battery services with cached getters', () => {
    const accessory = new FakeAccessory();

    bindThermostatAccessory({ hap, accessory, device: device(), sendCommands: jest.fn() });

    expect(accessory.services.map((service) => service.constructorToken)).toEqual([
      hap.Service.Thermostat,
      hap.Service.Battery,
    ]);
    expect(accessory.services[0]).toMatchObject({
      displayName: 'Hall Thermostat',
      subType: 'thermostat',
    });
    expect(
      accessory.services[0]?.getCharacteristic(hap.Characteristic.CurrentTemperature).getHandler?.(),
    ).toBe(21.1);
    expect(
      accessory.services[0]?.getCharacteristic(hap.Characteristic.TargetTemperature).getHandler?.(),
    ).toBe(22.5);
    expect(
      accessory.services[0]?.getCharacteristic(hap.Characteristic.CurrentHeatingCoolingState.token).getHandler?.(),
    ).toBe(hap.Characteristic.CurrentHeatingCoolingState.HEAT);
    expect(
      accessory.services[0]?.getCharacteristic(hap.Characteristic.TargetHeatingCoolingState.token).getHandler?.(),
    ).toBe(hap.Characteristic.TargetHeatingCoolingState.HEAT);
    expect(
      accessory.services[0]?.setValues.get(hap.Characteristic.TemperatureDisplayUnits.token),
    ).toBe(hap.Characteristic.TemperatureDisplayUnits.CELSIUS);
    expect(accessory.services[1]?.getCharacteristic(hap.Characteristic.BatteryLevel).getHandler?.()).toBe(74);
    expect(accessory.services[1]?.getCharacteristic(hap.Characteristic.StatusLowBattery).getHandler?.()).toBe(
      false,
    );
  });

  it('reuses existing thermostat service by subtype', () => {
    const accessory = new FakeAccessory();
    const existing = accessory.addService(hap.Service.Thermostat, 'Existing', 'thermostat');

    bindThermostatAccessory({ hap, accessory, device: device(), sendCommands: jest.fn() });

    expect(accessory.services[0]).toBe(existing);
  });

  it('sends target temperature commands and updates cached status after success', async () => {
    const accessory = new FakeAccessory();
    const tuyaDevice = device();
    const sendCommands = jest.fn().mockResolvedValue(undefined);

    bindThermostatAccessory({ hap, accessory, device: tuyaDevice, sendCommands });

    await accessory.services[0]?.getCharacteristic(hap.Characteristic.TargetTemperature).setHandler?.(19.5);

    expect(sendCommands).toHaveBeenCalledWith('thermostat-1', [{ code: 'temp_set', value: 195 }]);
    expect(tuyaDevice.status.temp_set).toBe(195);
    expect(accessory.context.tuyaStatus).toMatchObject({ temp_set: 195 });
  });

  it('sends target mode commands and updates cached status after success', async () => {
    const accessory = new FakeAccessory();
    const tuyaDevice = device();
    const sendCommands = jest.fn().mockResolvedValue(undefined);

    bindThermostatAccessory({ hap, accessory, device: tuyaDevice, sendCommands });

    await accessory.services[0]
      ?.getCharacteristic(hap.Characteristic.TargetHeatingCoolingState.token)
      .setHandler?.(hap.Characteristic.TargetHeatingCoolingState.AUTO);

    expect(sendCommands).toHaveBeenCalledWith('thermostat-1', [
      { code: 'switch', value: true },
      { code: 'mode', value: 'auto' },
    ]);
    expect(tuyaDevice.status).toMatchObject({ switch: true, mode: 'auto' });
    expect(accessory.context.tuyaStatus).toMatchObject({ switch: true, mode: 'auto' });
  });

  it('sends off commands through the target mode setter', async () => {
    const accessory = new FakeAccessory();
    const tuyaDevice = device();
    const sendCommands = jest.fn().mockResolvedValue(undefined);

    bindThermostatAccessory({ hap, accessory, device: tuyaDevice, sendCommands });

    await accessory.services[0]
      ?.getCharacteristic(hap.Characteristic.TargetHeatingCoolingState.token)
      .setHandler?.(hap.Characteristic.TargetHeatingCoolingState.OFF);

    expect(sendCommands).toHaveBeenCalledWith('thermostat-1', [{ code: 'switch', value: false }]);
    expect(tuyaDevice.status.switch).toBe(false);
    expect(accessory.context.tuyaStatus).toMatchObject({ switch: false });
  });

  it('does not mutate cached status when command sending fails', async () => {
    const accessory = new FakeAccessory();
    const tuyaDevice = device();
    const sendCommands = jest.fn().mockRejectedValue(new Error('cloud failed'));

    bindThermostatAccessory({ hap, accessory, device: tuyaDevice, sendCommands });

    await expect(
      accessory.services[0]?.getCharacteristic(hap.Characteristic.TargetTemperature).setHandler?.(19.5),
    ).rejects.toThrow('cloud failed');
    expect(tuyaDevice.status.temp_set).toBe(225);
    expect(accessory.context.tuyaStatus).toMatchObject({ temp_set: 225 });
  });

  it('does nothing when the device has no thermostat mapping', () => {
    const accessory = new FakeAccessory();

    bindThermostatAccessory({ hap, accessory, device: device({ category: 'wsdcg' }), sendCommands: jest.fn() });

    expect(accessory.services).toEqual([]);
  });
});
