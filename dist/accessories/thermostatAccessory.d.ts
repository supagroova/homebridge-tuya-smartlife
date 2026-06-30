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
        Thermostat: unknown;
        Battery: unknown;
    };
    Characteristic: {
        CurrentTemperature: unknown;
        TargetTemperature: unknown;
        CurrentHeatingCoolingState: HeatingCoolingCharacteristicLike;
        TargetHeatingCoolingState: TargetHeatingCoolingCharacteristicLike;
        TemperatureDisplayUnits: {
            token?: unknown;
            CELSIUS: unknown;
        };
        BatteryLevel: unknown;
        StatusLowBattery: unknown;
    };
};
type HeatingCoolingCharacteristicLike = {
    token?: unknown;
    OFF: unknown;
    HEAT: unknown;
    COOL: unknown;
};
type TargetHeatingCoolingCharacteristicLike = HeatingCoolingCharacteristicLike & {
    AUTO: unknown;
};
export type ThermostatCommandSender = (deviceId: string, commands: TuyaDeviceCommand[]) => Promise<void> | void;
export type BindThermostatAccessoryOptions = {
    hap: HapLike;
    accessory: AccessoryLike;
    device: TuyaDevice;
    sendCommands: ThermostatCommandSender;
    getDevice?: (deviceId: string) => TuyaDevice | undefined;
    applySnapshot?: (device: TuyaDevice) => void;
    communicationFailure?: () => Error;
};
export declare function bindThermostatAccessory(options: BindThermostatAccessoryOptions): void;
export {};
