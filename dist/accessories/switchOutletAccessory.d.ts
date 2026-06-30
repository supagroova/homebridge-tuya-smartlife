import type { TuyaDevice, TuyaDeviceCommand } from '../discovery/types';
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
export type SwitchOutletCommandSender = (deviceId: string, commands: TuyaDeviceCommand[]) => Promise<void> | void;
export type BindSwitchOutletAccessoryOptions = {
    hap: HapLike;
    accessory: AccessoryLike;
    device: TuyaDevice;
    sendCommands: SwitchOutletCommandSender;
    getDevice?: (deviceId: string) => TuyaDevice | undefined;
    applySnapshot?: (device: TuyaDevice) => void;
    communicationFailure?: () => Error;
};
export declare function bindSwitchOutletAccessory(options: BindSwitchOutletAccessoryOptions): void;
export {};
