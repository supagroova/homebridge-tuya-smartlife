import type { TuyaDevice } from '../discovery/types';
export type DeviceUpdateEvent = {
    device: TuyaDevice;
    previous: TuyaDevice | undefined;
};
export type DeviceUpdateListener = (event: DeviceUpdateEvent) => void;
export declare class UpdateHub {
    private readonly devices;
    private readonly listeners;
    replaceAll(devices: TuyaDevice[]): void;
    applySnapshot(device: TuyaDevice): void;
    get(deviceId: string): TuyaDevice | undefined;
    subscribe(deviceId: string, listener: DeviceUpdateListener): () => void;
}
