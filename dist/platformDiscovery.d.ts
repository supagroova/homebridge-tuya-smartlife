import type { PersistedTokenInfo } from './auth/types';
import type { TokenStore } from './auth/tokenStore';
import type { DiscoverDevicesResult, TuyaDevice, TuyaHome } from './discovery/types';
import type { AccessoryReconcileResult, RegistryAccessory } from './platform/accessoryRegistry';
type DiscoveryLogger = {
    info(message: string, ...parameters: unknown[]): void;
    warn(message: string, ...parameters: unknown[]): void;
    error(message: string, ...parameters: unknown[]): void;
};
type DiscoveryRepository = {
    discoverDevices(): Promise<DiscoverDevicesResult>;
};
type AccessoryRegistryLike<TAccessory extends RegistryAccessory> = {
    reconcile(devices: TuyaDevice[]): AccessoryReconcileResult<TAccessory>;
};
export type PlatformDiscoveryOptions<TClient, TAccessory extends RegistryAccessory> = {
    log: DiscoveryLogger;
    tokenStore: Pick<TokenStore, 'load'>;
    createClient(token: PersistedTokenInfo): TClient;
    createRepository(client: TClient): DiscoveryRepository;
    registry: AccessoryRegistryLike<TAccessory>;
};
export type PlatformDiscoveryResult<TAccessory extends RegistryAccessory> = {
    status: 'success';
    homes: TuyaHome[];
    devices: TuyaDevice[];
    reconcile: AccessoryReconcileResult<TAccessory>;
} | {
    status: 'reauth-required';
} | {
    status: 'failed';
    error: unknown;
};
export declare function runPlatformDiscovery<TClient, TAccessory extends RegistryAccessory>(options: PlatformDiscoveryOptions<TClient, TAccessory>): Promise<PlatformDiscoveryResult<TAccessory>>;
export {};
