import type { DiscoverDevicesResult, TuyaDevice, TuyaDeviceCommand, TuyaHome } from './types';
type DiscoveryClient = {
    get(path: string, params?: Record<string, unknown>): Promise<{
        result?: unknown;
    }>;
    post(path: string, params?: Record<string, unknown>, body?: Record<string, unknown>): Promise<{
        result?: unknown;
    }>;
};
export declare class DeviceRepository {
    private readonly client;
    constructor(client: DiscoveryClient);
    queryHomes(): Promise<TuyaHome[]>;
    queryDevicesByHome(homeId: string): Promise<TuyaDevice[]>;
    discoverDevices(): Promise<DiscoverDevicesResult>;
    sendCommands(deviceId: string, commands: TuyaDeviceCommand[]): Promise<void>;
    private normalizeDevice;
    private querySpecifications;
    private queryStatusRanges;
    private queryReportTypes;
}
export {};
