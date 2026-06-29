import type { TuyaDevice, TuyaDeviceCommand } from '../discovery/types';
export type StatusReaderOptions = {
    device: TuyaDevice;
    getDevice?: (deviceId: string) => TuyaDevice | undefined;
    applySnapshot?: (device: TuyaDevice) => void;
    communicationFailure?: () => Error;
};
export type StatusReader = {
    currentDevice(): TuyaDevice;
    requireOnlineDevice(): TuyaDevice;
    statusValue(code: string): unknown;
    applyCommandValues(commands: TuyaDeviceCommand[]): TuyaDevice;
};
export declare function createStatusReader(options: StatusReaderOptions): StatusReader;
