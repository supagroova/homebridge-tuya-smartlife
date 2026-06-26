import { bindSwitchOutletAccessory } from './switchOutletAccessory';
import type { TuyaDevice } from '../discovery/types';

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

  setCharacteristic(characteristic: unknown): this {
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
    Switch: Symbol('Switch'),
    Outlet: Symbol('Outlet'),
  },
  Characteristic: {
    On: Symbol('On'),
    OutletInUse: Symbol('OutletInUse'),
  },
};

function device(overrides: Partial<TuyaDevice> = {}): TuyaDevice {
  return {
    id: 'switch-1',
    name: 'Kitchen Switch',
    category: 'kg',
    productId: 'prod-switch',
    productName: 'Wall Switch',
    online: true,
    homeId: 'home-1',
    status: { switch_1: true },
    functions: {},
    statusRanges: {},
    reportTypes: {},
    raw: {},
    ...overrides,
  };
}

describe('bindSwitchOutletAccessory', () => {
  it('creates a switch service and returns cached status from onGet', () => {
    const accessory = new FakeAccessory();
    const sendCommands = jest.fn();

    bindSwitchOutletAccessory({ hap, accessory, device: device(), sendCommands });

    expect(accessory.services).toHaveLength(1);
    expect(accessory.services[0]).toMatchObject({
      constructorToken: hap.Service.Switch,
      displayName: 'Kitchen Switch',
      subType: 'switch_1',
    });
    expect(accessory.services[0]?.getCharacteristic(hap.Characteristic.On).getHandler?.()).toBe(true);
    expect(sendCommands).not.toHaveBeenCalled();
  });

  it('reads the latest cached status from getDevice', () => {
    const accessory = new FakeAccessory();

    bindSwitchOutletAccessory({
      hap,
      accessory,
      device: device(),
      sendCommands: jest.fn(),
      getDevice: () => device({ status: { switch_1: false } }),
      communicationFailure: () => new Error('offline'),
    });

    expect(accessory.services[0]?.getCharacteristic(hap.Characteristic.On).getHandler?.()).toBe(false);
  });

  it('throws communication failure for offline onGet and does not send offline onSet commands', async () => {
    const accessory = new FakeAccessory();
    const sendCommands = jest.fn();

    bindSwitchOutletAccessory({
      hap,
      accessory,
      device: device(),
      sendCommands,
      getDevice: () => device({ online: false }),
      communicationFailure: () => new Error('offline'),
    });

    expect(() => accessory.services[0]?.getCharacteristic(hap.Characteristic.On).getHandler?.()).toThrow(
      'offline',
    );
    await expect(accessory.services[0]?.getCharacteristic(hap.Characteristic.On).setHandler?.(false)).rejects.toThrow(
      'offline',
    );
    expect(sendCommands).not.toHaveBeenCalled();
  });

  it('creates outlet services for outlet categories', () => {
    const accessory = new FakeAccessory();

    bindSwitchOutletAccessory({
      hap,
      accessory,
      device: device({ category: 'pc', name: 'Power Strip', status: { switch: false } }),
      sendCommands: jest.fn(),
    });

    expect(accessory.services[0]).toMatchObject({
      constructorToken: hap.Service.Outlet,
      displayName: 'Power Strip',
      subType: 'switch',
    });
    expect(accessory.services[0]?.characteristics.has(hap.Characteristic.OutletInUse)).toBe(true);
  });

  it('reuses existing services by service type and DP subtype', () => {
    const accessory = new FakeAccessory();
    const existing = accessory.addService(hap.Service.Switch, 'Existing', 'switch_1');

    bindSwitchOutletAccessory({ hap, accessory, device: device(), sendCommands: jest.fn() });

    expect(accessory.services).toEqual([existing]);
  });

  it('creates one service per multi-gang switch DP', () => {
    const accessory = new FakeAccessory();

    bindSwitchOutletAccessory({
      hap,
      accessory,
      device: device({
        name: 'Three Gang',
        status: { switch_2: false, switch_1: true, switch_3: true },
      }),
      sendCommands: jest.fn(),
    });

    expect(accessory.services.map((service) => service.subType)).toEqual(['switch_1', 'switch_2', 'switch_3']);
    expect(accessory.services.map((service) => service.displayName)).toEqual([
      'Three Gang 1',
      'Three Gang 2',
      'Three Gang 3',
    ]);
  });

  it('sends commands and updates cached status after successful onSet', async () => {
    const accessory = new FakeAccessory();
    const tuyaDevice = device();
    const sendCommands = jest.fn().mockResolvedValue(undefined);
    const applySnapshot = jest.fn();

    bindSwitchOutletAccessory({ hap, accessory, device: tuyaDevice, sendCommands, applySnapshot });

    await accessory.services[0]?.getCharacteristic(hap.Characteristic.On).setHandler?.(false);

    expect(sendCommands).toHaveBeenCalledWith('switch-1', [{ code: 'switch_1', value: false }]);
    expect(applySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'switch-1', status: { switch_1: false } }),
    );
    expect(tuyaDevice.status.switch_1).toBe(true);
    expect(accessory.context.tuyaStatus).toEqual({ switch_1: false });
  });

  it('does not mutate cached status when command sending fails', async () => {
    const accessory = new FakeAccessory();
    const tuyaDevice = device();
    const sendCommands = jest.fn().mockRejectedValue(new Error('cloud failed'));

    bindSwitchOutletAccessory({ hap, accessory, device: tuyaDevice, sendCommands });

    await expect(accessory.services[0]?.getCharacteristic(hap.Characteristic.On).setHandler?.(false)).rejects.toThrow(
      'cloud failed',
    );
    expect(tuyaDevice.status.switch_1).toBe(true);
    expect(accessory.context.tuyaStatus).toEqual({ switch_1: true });
  });
});
