import type { TuyaDevice } from '../discovery/types';
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
export declare function bindSensorAccessory(options: BindSensorAccessoryOptions): void;
export {};
