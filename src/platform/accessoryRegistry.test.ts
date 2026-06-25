import { AccessoryRegistry } from './accessoryRegistry';
import type { TuyaDevice } from '../discovery/types';

type MockAccessory = {
  displayName: string;
  UUID: string;
  context: Record<string, unknown>;
};

class MockPlatformAccessory implements MockAccessory {
  context: Record<string, unknown> = {};

  constructor(
    readonly displayName: string,
    readonly UUID: string,
  ) {}
}

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

function apiMock() {
  const registerPlatformAccessories = jest.fn();
  const unregisterPlatformAccessories = jest.fn();
  const api = {
    hap: {
      uuid: {
        generate: jest.fn((input: string) => `uuid:${input}`),
      },
    },
    platformAccessory: MockPlatformAccessory,
    registerPlatformAccessories,
    unregisterPlatformAccessories,
  };

  return { api, registerPlatformAccessories, unregisterPlatformAccessories };
}

describe('AccessoryRegistry', () => {
  it('registers a new supported device with a stable UUID and context metadata', () => {
    const { api, registerPlatformAccessories } = apiMock();
    const bindAccessory = jest.fn();
    const registry = new AccessoryRegistry({
      api,
      pluginName: 'homebridge-tuya-smartlife',
      platformName: 'TuyaSmartLife',
      cachedAccessories: [],
      bindAccessory,
    });

    const result = registry.reconcile([device()]);

    expect(api.hap.uuid.generate).toHaveBeenCalledWith('tuya-smartlife:switch-1');
    expect(registerPlatformAccessories).toHaveBeenCalledTimes(1);
    expect(registerPlatformAccessories.mock.calls[0]).toEqual([
      'homebridge-tuya-smartlife',
      'TuyaSmartLife',
      [
        expect.objectContaining({
          displayName: 'Kitchen Switch',
          UUID: 'uuid:tuya-smartlife:switch-1',
          context: expect.objectContaining({
            tuyaDeviceId: 'switch-1',
            tuyaCategory: 'kg',
            tuyaHomeId: 'home-1',
            tuyaDeviceName: 'Kitchen Switch',
            tuyaDeviceOnline: true,
            tuyaProductId: 'prod-switch',
            tuyaStatus: { switch_1: true },
          }),
        }),
      ],
    ]);
    expect(result.registered).toHaveLength(1);
    expect(bindAccessory).toHaveBeenCalledWith(
      expect.objectContaining({ context: expect.objectContaining({ tuyaDeviceId: 'switch-1' }) }),
      expect.objectContaining({ id: 'switch-1' }),
    );
  });

  it('reuses a cached accessory when the Tuya device id matches', () => {
    const { api, registerPlatformAccessories } = apiMock();
    const bindAccessory = jest.fn();
    const cached = new MockPlatformAccessory('Old Name', 'uuid:tuya-smartlife:switch-1');
    cached.context.tuyaDeviceId = 'switch-1';
    const registry = new AccessoryRegistry({
      api,
      pluginName: 'homebridge-tuya-smartlife',
      platformName: 'TuyaSmartLife',
      cachedAccessories: [cached],
      bindAccessory,
    });

    const result = registry.reconcile([device({ name: 'New Name' })]);

    expect(registerPlatformAccessories).not.toHaveBeenCalled();
    expect(result.restored).toEqual([cached]);
    expect(cached.context).toMatchObject({
      tuyaDeviceId: 'switch-1',
      tuyaDeviceName: 'New Name',
    });
    expect(bindAccessory).toHaveBeenCalledWith(cached, expect.objectContaining({ id: 'switch-1' }));
  });

  it('does not register unsupported categories as placeholder accessories', () => {
    const { api, registerPlatformAccessories } = apiMock();
    const bindAccessory = jest.fn();
    const registry = new AccessoryRegistry({
      api,
      pluginName: 'homebridge-tuya-smartlife',
      platformName: 'TuyaSmartLife',
      cachedAccessories: [],
      bindAccessory,
    });

    const result = registry.reconcile([device({ id: 'light-1', category: 'dj' })]);

    expect(registerPlatformAccessories).not.toHaveBeenCalled();
    expect(bindAccessory).not.toHaveBeenCalled();
    expect(result.unsupported.map((unsupportedDevice) => unsupportedDevice.id)).toEqual(['light-1']);
  });

  it('prunes cached accessories whose Tuya device id is missing from discovery', () => {
    const { api, unregisterPlatformAccessories } = apiMock();
    const cached = new MockPlatformAccessory('Removed Device', 'uuid:tuya-smartlife:removed-1');
    cached.context.tuyaDeviceId = 'removed-1';
    const registry = new AccessoryRegistry({
      api,
      pluginName: 'homebridge-tuya-smartlife',
      platformName: 'TuyaSmartLife',
      cachedAccessories: [cached],
    });

    const result = registry.reconcile([device()]);

    expect(unregisterPlatformAccessories).toHaveBeenCalledWith('homebridge-tuya-smartlife', 'TuyaSmartLife', [
      cached,
    ]);
    expect(result.pruned).toEqual([cached]);
  });
});
