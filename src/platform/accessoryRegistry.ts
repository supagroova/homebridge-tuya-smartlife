import { isSupportedCategory } from '../discovery/supportedCategories';
import type { TuyaDevice } from '../discovery/types';

export type RegistryAccessory = {
  displayName: string;
  UUID: string;
  context: Record<string, unknown>;
};

type AccessoryConstructor<TAccessory extends RegistryAccessory> = new (
  displayName: string,
  uuid: string,
) => TAccessory;

type AccessoryRegistryApi<TAccessory extends RegistryAccessory> = {
  hap: {
    uuid: {
      generate(input: string): string;
    };
  };
  platformAccessory: AccessoryConstructor<TAccessory>;
  registerPlatformAccessories(pluginName: string, platformName: string, accessories: TAccessory[]): void;
  unregisterPlatformAccessories(pluginName: string, platformName: string, accessories: TAccessory[]): void;
};

export type AccessoryRegistryOptions<TAccessory extends RegistryAccessory> = {
  api: AccessoryRegistryApi<TAccessory>;
  pluginName: string;
  platformName: string;
  cachedAccessories: TAccessory[];
};

export type AccessoryReconcileResult<TAccessory extends RegistryAccessory> = {
  registered: TAccessory[];
  restored: TAccessory[];
  pruned: TAccessory[];
  unsupported: TuyaDevice[];
};

export class AccessoryRegistry<TAccessory extends RegistryAccessory = RegistryAccessory> {
  constructor(private readonly options: AccessoryRegistryOptions<TAccessory>) {}

  reconcile(devices: TuyaDevice[]): AccessoryReconcileResult<TAccessory> {
    const discoveredIds = new Set(devices.map((device) => device.id));
    const cachedByDeviceId = new Map(
      this.options.cachedAccessories
        .map((accessory) => [accessory.context.tuyaDeviceId, accessory] as const)
        .filter((entry): entry is readonly [string, TAccessory] => typeof entry[0] === 'string'),
    );
    const registered: TAccessory[] = [];
    const restored: TAccessory[] = [];
    const unsupported: TuyaDevice[] = [];

    for (const device of devices) {
      if (!isSupportedCategory(device.category)) {
        unsupported.push(device);
        continue;
      }

      const cached = cachedByDeviceId.get(device.id);

      if (cached) {
        updateContext(cached, device);
        restored.push(cached);
        continue;
      }

      const accessory = new this.options.api.platformAccessory(device.name, this.uuidFor(device.id));
      updateContext(accessory, device);
      registered.push(accessory);
    }

    if (registered.length > 0) {
      this.options.api.registerPlatformAccessories(
        this.options.pluginName,
        this.options.platformName,
        registered,
      );
    }

    const pruned = this.options.cachedAccessories.filter((accessory) => {
      const deviceId = accessory.context.tuyaDeviceId;

      return typeof deviceId === 'string' && !discoveredIds.has(deviceId);
    });

    if (pruned.length > 0) {
      this.options.api.unregisterPlatformAccessories(
        this.options.pluginName,
        this.options.platformName,
        pruned,
      );
    }

    return {
      registered,
      restored,
      pruned,
      unsupported,
    };
  }

  private uuidFor(deviceId: string): string {
    return this.options.api.hap.uuid.generate(`tuya-smartlife:${deviceId}`);
  }
}

function updateContext(accessory: RegistryAccessory, device: TuyaDevice): void {
  accessory.context.tuyaDeviceId = device.id;
  accessory.context.tuyaCategory = device.category;
  accessory.context.tuyaHomeId = device.homeId;
  accessory.context.tuyaDeviceName = device.name;
  accessory.context.tuyaDeviceOnline = device.online;
  accessory.context.tuyaProductId = device.productId;
  accessory.context.tuyaStatus = device.status;
}
