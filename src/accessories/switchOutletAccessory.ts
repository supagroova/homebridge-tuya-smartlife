import type { TuyaDevice, TuyaDeviceCommand } from '../discovery/types';
import { buildSwitchOutletMappings } from '../mappers/switchOutlet';
import { createStatusReader } from './statusReader';

type CharacteristicLike = {
  onGet(handler: () => unknown): CharacteristicLike;
  onSet(handler: (value: unknown) => void | Promise<void>): CharacteristicLike;
};

type ServiceLike = {
  getCharacteristic(characteristic: unknown): CharacteristicLike;
  setCharacteristic?(characteristic: unknown, value: unknown): ServiceLike;
};

type AccessoryLike = {
  context: Record<string, unknown>;
  getServiceById(serviceConstructor: unknown, subType: string): ServiceLike | undefined;
  addService(serviceConstructor: unknown, displayName: string, subType: string): ServiceLike;
};

type HapLike = {
  Service: {
    Switch: unknown;
    Outlet: unknown;
  };
  Characteristic: {
    On: unknown;
    OutletInUse: unknown;
  };
};

export type SwitchOutletCommandSender = (
  deviceId: string,
  commands: TuyaDeviceCommand[],
) => Promise<void> | void;

export type BindSwitchOutletAccessoryOptions = {
  hap: HapLike;
  accessory: AccessoryLike;
  device: TuyaDevice;
  sendCommands: SwitchOutletCommandSender;
  getDevice?: (deviceId: string) => TuyaDevice | undefined;
  applySnapshot?: (device: TuyaDevice) => void;
  communicationFailure?: () => Error;
};

export function bindSwitchOutletAccessory(options: BindSwitchOutletAccessoryOptions): void {
  options.accessory.context.tuyaStatus = { ...options.device.status };
  const statusReader = createStatusReader(options);

  for (const mapping of buildSwitchOutletMappings(options.device)) {
    const serviceConstructor =
      mapping.serviceType === 'outlet' ? options.hap.Service.Outlet : options.hap.Service.Switch;
    const service =
      options.accessory.getServiceById(serviceConstructor, mapping.code) ??
      options.accessory.addService(serviceConstructor, mapping.displayName, mapping.code);

    if (mapping.serviceType === 'outlet') {
      service.setCharacteristic?.(options.hap.Characteristic.OutletInUse, true);
    }

    service
      .getCharacteristic(options.hap.Characteristic.On)
      .onGet(() => statusReader.statusValue(mapping.code))
      .onSet(async (value) => {
        statusReader.requireOnlineDevice();
        const nextValue = Boolean(value);
        const command = mapping.command(nextValue);
        await options.sendCommands(options.device.id, [command]);
        const nextDevice = statusReader.applyCommandValues([command]);
        options.accessory.context.tuyaStatus = { ...nextDevice.status };
      });
  }
}
